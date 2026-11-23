import { query, transaction } from '../../config/db.js';
import { HttpError } from '../../lib/http.js';
import {
  domainActions,
  actionField as f,
  type DomainAction,
} from './domainActions.js';
import { createAccount, updateAccount } from './accountAdministration.js';
import { reindex } from '../guides/guides.routes.js';
import { cleanupUploads } from '../../services/uploads.js';
import { notifyAdmins } from '../../services/notifications.js';
import { randomUUID } from 'node:crypto';
export const maintenanceActions: DomainAction[] = [
  {
    id: 'create-user',
    label: 'Create account and send recovery link',
    table: 'users',
    destructive: true,
    fields: [
      f('email'),
      f('firstName'),
      f('lastName'),
      f('role', 'select', true, [
        'CARE_PARTNER',
        'CLINICIAN_MODERATOR',
        'SYSTEM_ADMIN',
      ]),
      f('condition', 'select', false, ['FTD', 'AD']),
    ],
    execute: async (req, a) => {
      const id = await createAccount(req, {
        email: a.email,
        first_name: a.firstName,
        last_name: a.lastName,
        role: a.role,
        condition: a.condition,
      });
      if (a.role === 'CARE_PARTNER')
        await transaction((client) =>
          notifyAdmins(client, {
            kind: 'ADMIN_USER_ACTIVITY',
            eventKey: `new-member:${id}`,
            context: { userId: id },
          }),
        );
      return { id };
    },
  },
  {
    id: 'set-user-active',
    label: 'Activate or deactivate account',
    table: 'users',
    destructive: true,
    fields: [f('id'), f('isActive', 'boolean')],
    execute: (req, a) =>
      updateAccount(req, String(a.id), { is_active: a.isActive }),
  },
  {
    id: 'force-sign-out',
    label: 'Sign account out everywhere',
    table: 'users',
    destructive: true,
    fields: [f('id')],
    execute: (req, a) => updateAccount(req, String(a.id), {}, true),
  },
  {
    id: 'change-role',
    label: 'Change account role',
    table: 'users',
    destructive: true,
    fields: [
      f('id'),
      f('role', 'select', true, [
        'CARE_PARTNER',
        'CLINICIAN_MODERATOR',
        'SYSTEM_ADMIN',
      ]),
      f('condition', 'select', false, ['FTD', 'AD']),
    ],
    execute: (req, a) =>
      updateAccount(req, String(a.id), {
        role: a.role,
        ...(a.condition ? { condition: a.condition } : {}),
      }),
  },
  {
    id: 'send-password-reset',
    label: 'Send password-reset link',
    table: 'users',
    destructive: false,
    fields: [f('id')],
    execute: async (_req, a) => {
      const user = (
        await query('SELECT email FROM users WHERE id=$1 AND is_active', [a.id])
      ).rows[0];
      if (!user) throw new HttpError(404, 'Active account not found');
      await query('INSERT INTO password_recovery_jobs(email) VALUES($1)', [
        user.email,
      ]);
    },
  },
  {
    id: 'resend-invitation',
    label: 'Replace and resend invitation',
    table: 'invitations',
    destructive: true,
    fields: [f('id')],
    execute: async (req, a) => {
      const i = (
        await query(
          'SELECT email,first_name,last_name,phone_number,clinic_patient_id,primary_cohort_slug,condition,status FROM invitations WHERE id=$1 FOR UPDATE',
          [a.id],
        )
      ).rows[0];
      if (!i || i.status === 'ACCEPTED')
        throw new HttpError(409, 'Choose an unaccepted invitation');
      if (i.status === 'DISPATCHED')
        await domainActions
          .find((a) => a.id === 'revoke-invitation')!
          .execute(req, a);
      return domainActions
        .find((a) => a.id === 'create-invitation')!
        .execute(req, {
          email: i.email,
          firstName: i.first_name || undefined,
          lastName: i.last_name || undefined,
          phoneNumber: i.phone_number || undefined,
          clinicPatientId: i.clinic_patient_id || undefined,
          primaryCohortSlug: i.primary_cohort_slug,
          condition: i.condition,
        });
    },
  },
  {
    id: 'rebuild-guide',
    label: 'Rebuild guide search index',
    table: 'chatbot_guides',
    destructive: false,
    fields: [f('id')],
    execute: async (_req, a) =>
      transaction(async (client) => {
        const g = (
          await client.query(
            'SELECT * FROM chatbot_guides WHERE id=$1 FOR UPDATE',
            [a.id],
          )
        ).rows[0];
        if (!g) throw new HttpError(404, 'Guide not found');
        return { chunks: await reindex(client, g) };
      }),
  },
  {
    id: 'resend-email',
    label: 'Retry failed notification email',
    table: 'notification_email_jobs',
    destructive: false,
    fields: [f('notificationId')],
    execute: async (_req, a) => {
      const r = await query(
        'UPDATE notification_email_jobs SET attempts=0,completed_at=NULL,skipped_at=NULL,next_attempt_at=NOW(),locked_until=NULL,last_error=NULL WHERE notification_id=$1 AND completed_at IS NULL AND attempts>=5 AND (locked_until IS NULL OR locked_until<NOW()) RETURNING notification_id',
        [a.notificationId],
      );
      if (!r.rowCount)
        throw new HttpError(
          409,
          'Choose a permanently failed, unlocked email job',
        );
    },
  },
  {
    id: 'purge-expired-invitations',
    label: 'Purge up to 200 expired invitations',
    table: 'invitations',
    destructive: true,
    fields: [],
    execute: () =>
      query(
        "DELETE FROM invitations WHERE id IN(SELECT id FROM invitations WHERE expires_at<NOW() AND status<>'ACCEPTED' ORDER BY expires_at LIMIT 200 FOR UPDATE)",
      ),
  },
  {
    id: 'purge-expired-resets',
    label: 'Purge up to 200 expired reset records',
    table: 'password_resets',
    destructive: true,
    fields: [],
    execute: () =>
      query(
        'DELETE FROM password_resets WHERE id IN(SELECT id FROM password_resets WHERE expires_at<NOW() ORDER BY expires_at LIMIT 200 FOR UPDATE)',
      ),
  },
  {
    id: 'delete-orphan-uploads',
    label: 'Delete aged unreferenced PDF uploads',
    table: 'guide_uploads',
    destructive: true,
    fields: [],
    execute: async () => ({ queuedCleanup: true, operation: randomUUID() }),
  },
];
export const actions = [...domainActions, ...maintenanceActions];
export const cleanupOrphanFiles = cleanupUploads;
