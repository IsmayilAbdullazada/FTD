import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Request } from 'express';
import { query } from '../../config/db.js';
import { HttpError } from '../../lib/http.js';
import { identifier } from './adminRegistry.js';
const userChanges = z
  .object({
    email: z.string().email().optional(),
    first_name: z.string().trim().min(1).optional(),
    last_name: z.string().trim().min(1).optional(),
    phone_number: z.string().nullable().optional(),
    clinic_patient_id: z.string().nullable().optional(),
    condition: z.enum(['FTD', 'AD']).nullable().optional(),
    role: z
      .enum(['CARE_PARTNER', 'CLINICIAN_MODERATOR', 'SYSTEM_ADMIN'])
      .optional(),
    is_active: z.boolean().optional(),
    badge_label: z.string().min(1).optional(),
    avatar_color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
    anonymous_handle: z.string().min(1).optional(),
  })
  .strict();
export async function updateAccount(
  req: Request,
  userId: string,
  values: Record<string, unknown>,
  forceSignOut = false,
) {
  await query(
    "SELECT pg_advisory_xact_lock(hashtext('ftdcare-admin-account-guard'))",
  );
  const actor = (
    await query('SELECT role,is_active FROM users WHERE id=$1 FOR UPDATE', [
      req.user!.id,
    ])
  ).rows[0];
  if (!actor?.is_active || actor.role !== 'SYSTEM_ADMIN')
    throw new HttpError(403, 'Your administrator access is no longer active');
  const user = (
    await query(
      'SELECT id,role,is_active,condition,anonymous_handle FROM users WHERE id=$1 FOR UPDATE',
      [userId],
    )
  ).rows[0];
  if (!user) throw new HttpError(404, 'Account not found');
  const change = userChanges.parse(values);
  const losesAdmin =
    user.role === 'SYSTEM_ADMIN' &&
    ((change.role && change.role !== 'SYSTEM_ADMIN') ||
      change.is_active === false);
  if (losesAdmin) {
    if (userId === req.user!.id)
      throw new HttpError(
        409,
        'You cannot demote or deactivate your own administrator account',
      );
    const count = (
      await query(
        "SELECT COUNT(*)::int count FROM users WHERE role='SYSTEM_ADMIN' AND is_active",
      )
    ).rows[0].count;
    if (user.is_active && count <= 1)
      throw new HttpError(409, 'Keep at least one active CS Admin');
  }
  if ((change.role || user.role) === 'CARE_PARTNER') {
    if (!change.condition && !user.condition)
      throw new HttpError(400, 'A care partner account needs a condition');
    if (
      !/^User-\d{3}$/.test(
        String(change.anonymous_handle || user.anonymous_handle),
      )
    ) {
      if (change.anonymous_handle)
        throw new HttpError(400, 'Care partner tags must use User-123 format');
      const allocated = (
        await query('SELECT public.allocate_anonymous_handle() handle')
      ).rows[0].handle;
      change.anonymous_handle = allocated;
    }
  }
  const entries = Object.entries(change);
  if (!entries.length && !forceSignOut)
    throw new HttpError(400, 'No account changes supplied');
  const revoke =
    forceSignOut ||
    change.role !== undefined ||
    change.is_active !== undefined ||
    change.email !== undefined;
  await query(
    `UPDATE users SET ${entries
      .map(([column], i) => `${identifier(column)}=$${i + 1}`)
      .concat([
        'updated_at=NOW()',
        ...(revoke ? ['session_version=session_version+1'] : []),
      ])
      .join(',')} WHERE id=$${entries.length + 1}`,
    [...entries.map(([, value]) => value), userId],
  );
}
export async function createAccount(
  req: Request,
  values: Record<string, unknown>,
) {
  const i = userChanges
    .required({ email: true, first_name: true, last_name: true, role: true })
    .parse(values);
  if (i.role === 'CARE_PARTNER' && !i.condition)
    throw new HttpError(400, 'Select the care partner condition');
  const password = await bcrypt.hash(
    crypto.randomBytes(48).toString('base64url'),
    12,
  );
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO users(id,email,password_hash,role,first_name,last_name,phone_number,clinic_patient_id,condition,anonymous_handle,badge_label,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $4='CARE_PARTNER' THEN public.allocate_anonymous_handle() ELSE $5||' '||$6 END,$10,$11)`,
    [
      id,
      i.email,
      password,
      i.role,
      i.first_name,
      i.last_name,
      i.phone_number || null,
      i.clinic_patient_id || null,
      i.condition || null,
      i.badge_label ||
        (i.role === 'CARE_PARTNER'
          ? 'Care Partner'
          : i.role === 'SYSTEM_ADMIN'
            ? 'CS Admin'
            : 'Moderator'),
      i.is_active ?? true,
    ],
  );
  if (i.role === 'CARE_PARTNER')
    await query(
      "INSERT INTO cohort_members(user_id,cohort_id,is_primary) VALUES($1,'group-general',true)",
      [id],
    );
  await query('INSERT INTO password_recovery_jobs(email) VALUES($1)', [
    i.email,
  ]);

  return id;
}
