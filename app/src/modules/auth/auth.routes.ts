import { composeEmail, escapeHtml } from '../../services/emailTemplates.js';
import { notify } from '../../services/notifications.js';
import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { query, transaction } from '../../config/db.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { currentUser } from '../../lib/serializers.js';
import { readPreview, sendEmail } from '../../services/email.js';
import { authenticateToken, requireStaff } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { clearSessionCookie, setSessionCookie } from '../../lib/session.js';

const dummyPasswordHash = bcrypt.hashSync(
  crypto.randomBytes(32).toString('hex'),
  12,
);
const router = Router();
router.use(authLimiter);
const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');
const tokenFor = (user: {
  id: string;
  email: string;
  role: string;
  session_version: number;
}) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.session_version,
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      issuer: 'ftdcare-api',
      audience: 'ftdcare-web',
    },
  );

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { identifier, password, rememberMe } = z
      .object({
        identifier: z.string().trim().min(1),
        password: z.string().min(1),
        rememberMe: z.boolean().default(false),
      })
      .parse(req.body);
    const result = await query(
      `SELECT * FROM users WHERE is_active AND (LOWER(email)=LOWER($1) OR clinic_patient_id=$1) LIMIT 1`,
      [identifier],
    );
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(
      password,
      user?.password_hash ?? dummyPasswordHash,
    );
    if (!user || !validPassword)
      throw new HttpError(401, 'Invalid email, Clinic Patient ID, or password');
    const token = tokenFor(user as Parameters<typeof tokenFor>[0]);
    setSessionCookie(res, token, rememberMe);
    res.json({
      success: true,
      user: currentUser(user as Parameters<typeof currentUser>[0]),
    });
  }),
);

router.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req, res) => {
    await query(
      'UPDATE users SET session_version=session_version+1 WHERE id=$1',
      [req.user!.id],
    );
    clearSessionCookie(res);
    res.json({ success: true });
  }),
);

router.post(
  '/change-password',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      })
      .parse(req.body);

    const updatedUser = await transaction(async (client) => {
      const result = await client.query(
        `SELECT id,email,role,password_hash,session_version FROM users WHERE id=$1 AND is_active FOR UPDATE`,
        [req.user!.id],
      );
      const user = result.rows[0];
      if (!user) throw new HttpError(404, 'Account not found.');

      const validCurrent = await bcrypt.compare(
        input.currentPassword,
        user.password_hash ?? dummyPasswordHash,
      );
      if (!validCurrent)
        throw new HttpError(400, 'Current password is incorrect.');

      const isSamePassword = await bcrypt.compare(
        input.newPassword,
        user.password_hash ?? dummyPasswordHash,
      );
      if (isSamePassword)
        throw new HttpError(
          400,
          'New password must be different from your current password.',
        );

      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      const updated = await client.query(
        `UPDATE users
         SET password_hash=$1,session_version=session_version+1,updated_at=NOW()
         WHERE id=$2
         RETURNING id,email,role,session_version`,
        [passwordHash, user.id],
      );
      await client.query(
        'UPDATE password_resets SET consumed_at=NOW() WHERE user_id=$1 AND consumed_at IS NULL',
        [user.id],
      );
      await notify(client, {
        kind: 'PASSWORD_CHANGED',
        recipients: [user.id],
        eventKey: `password-changed:${user.id}:${updated.rows[0].session_version}`,
      });
      return updated.rows[0];
    });

    const token = tokenFor(updatedUser as Parameters<typeof tokenFor>[0]);
    setSessionCookie(res, token, true);
    res.json({ success: true, message: 'Password updated successfully.' });
  }),
);

router.post(
  '/invitations',
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        email: z.string().email(),
        firstName: z.string().trim().optional(),
        lastName: z.string().trim().optional(),
        clinicPatientId: z.string().trim().optional(),
        primaryCohortSlug: z.string().trim().min(1),
        condition: z.enum(['FTD', 'AD']),
        phoneNumber: z.string().trim().optional(),
      })
      .parse(req.body);
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const result = await query(
      `INSERT INTO invitations(token_hash,email,first_name,last_name,phone_number,clinic_patient_id,primary_cohort_slug,condition,issued_by,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,status,expires_at`,
      [
        sha256(token),
        input.email.toLowerCase(),
        input.firstName ?? null,
        input.lastName ?? null,
        input.phoneNumber ?? null,
        input.clinicPatientId ?? null,
        input.primaryCohortSlug,
        input.condition,
        req.user!.id,
        expiresAt,
      ],
    );
    const invitation = result.rows[0];
    const registrationUrl = `${env.APP_URL.replace(/\/$/, '')}/register?token=${encodeURIComponent(token)}`;
    const delivery = await sendEmail({
      to: input.email,
      ...composeEmail({
        subject: 'You are invited to Care Partner Connect',
        greeting: input.firstName ? `Hello ${input.firstName},` : 'Hello,',
        paragraphs: [
          'You have been invited to join Hopkins Care Partner Connect, a private community for care partners supported by a clinical moderation team.',
          'To get started, create your account using the link below. Your invitation is valid for three days.',
          'If you were not expecting this invitation, you can safely ignore this email.',
        ],
        action: { label: 'Create your account', url: registrationUrl },
      }),
    });
    res.status(201).json({
      invitationId: invitation.id,
      inviteToken: token,
      inviteExpiresAt: invitation.expires_at,
      registrationUrl,
      status: invitation.status,
      ...delivery,
    });
  }),
);

router.get(
  '/invitations/:token',
  asyncHandler(async (req, res) => {
    await query(
      "UPDATE invitations SET status='EXPIRED' WHERE token_hash=$1 AND status='DISPATCHED' AND expires_at<=NOW()",
      [sha256(String(req.params.token))],
    );
    const result = await query(
      `SELECT email,first_name,last_name,condition,primary_cohort_slug,status,expires_at FROM invitations WHERE token_hash=$1`,
      [sha256(String(req.params.token))],
    );
    const invitation = result.rows[0];
    if (
      !invitation ||
      invitation.status !== 'DISPATCHED' ||
      new Date(invitation.expires_at) <= new Date()
    ) {
      throw new HttpError(404, 'Invitation not found or expired');
    }
    res.json({
      valid: true,
      invitation: {
        email: invitation.email,
        firstName: invitation.first_name ?? '',
        lastName: invitation.last_name ?? '',
        condition: invitation.condition,
        primaryCohortSlug: invitation.primary_cohort_slug,
      },
    });
  }),
);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        token: z.string().min(20),
        password: z.string().min(8).max(128),
        firstName: z.string().trim().optional(),
        lastName: z.string().trim().optional(),
        phoneNumber: z.string().trim().optional(),
      })
      .parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await transaction(async (client) => {
      const inviteResult = await client.query(
        `SELECT i.*,c.id AS cohort_id FROM invitations i JOIN cohorts c ON c.slug=i.primary_cohort_slug
       WHERE i.token_hash=$1 FOR UPDATE`,
        [sha256(input.token)],
      );
      const invite = inviteResult.rows[0];
      if (
        !invite ||
        invite.status !== 'DISPATCHED' ||
        new Date(invite.expires_at) <= new Date()
      )
        throw new HttpError(400, 'Invitation not found or expired');
      const id = `user-care-${crypto.randomUUID()}`;
      const inserted = await client.query(
        `INSERT INTO users(id,email,password_hash,role,first_name,last_name,phone_number,clinic_patient_id,condition,anonymous_handle,avatar_color,badge_label)
       VALUES($1,$2,$3,'CARE_PARTNER',$4,$5,$6,$7,$8,public.allocate_anonymous_handle(),'#1E40AF','Care Partner') RETURNING *`,
        [
          id,
          invite.email,
          passwordHash,
          input.firstName || invite.first_name || 'Care',
          input.lastName || invite.last_name || 'Partner',
          input.phoneNumber || invite.phone_number,
          invite.clinic_patient_id,
          invite.condition,
        ],
      );
      await client.query(
        `INSERT INTO cohort_members(cohort_id,user_id,is_primary) VALUES($1,$2,true),('group-general',$2,false) ON CONFLICT DO NOTHING`,
        [invite.cohort_id, id],
      );
      await client.query(
        `UPDATE invitations SET status='ACCEPTED',accepted_at=NOW() WHERE id=$1`,
        [invite.id],
      );
      await notify(client, {
        kind: 'WELCOME',
        recipients: [id],
        eventKey: `welcome:${id}`,
      });
      await notify(client, {
        kind: 'INVITATION_ACCEPTED',
        recipients: [invite.issued_by],
        actorId: id,
        eventKey: `invitation-accepted:${invite.id}`,
      });
      return inserted.rows[0];
    });
    const token = tokenFor(user as Parameters<typeof tokenFor>[0]);
    setSessionCookie(res, token, true);
    res.status(201).json({
      success: true,
      user: currentUser(user as Parameters<typeof currentUser>[0]),
    });
  }),
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await query('INSERT INTO password_recovery_jobs(email) VALUES($1)', [
      email,
    ]);
    res.json({
      success: true,
      message: 'If that account exists, recovery instructions will be emailed.',
      requiresEmailLink: true,
    });
  }),
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
        newPassword: z.string().min(8).max(128),
      })
      .parse(req.body);
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await transaction(async (client) => {
      // Lock the user before their resets, matching the recovery worker's order.
      const users = await client.query(
        `SELECT u.id FROM users u JOIN password_resets pr ON pr.user_id=u.id
         WHERE pr.token_hash=$1 AND u.is_active AND pr.consumed_at IS NULL AND pr.expires_at>NOW()
         FOR UPDATE OF u`,
        [sha256(input.token)],
      );
      const user = users.rows[0];
      if (!user)
        throw new HttpError(
          400,
          'Reset link is invalid or expired. Request a new link.',
        );
      const consumed = await client.query(
        `UPDATE password_resets SET consumed_at=clock_timestamp()
         WHERE token_hash=$1 AND user_id=$2 AND consumed_at IS NULL AND expires_at>clock_timestamp()
         RETURNING id`,
        [sha256(input.token), user.id],
      );
      if (!consumed.rowCount)
        throw new HttpError(
          400,
          'Reset link is invalid or expired. Request a new link.',
        );
      await client.query(
        `UPDATE users SET password_hash=$1,session_version=session_version+1,updated_at=NOW() WHERE id=$2`,
        [passwordHash, user.id],
      );
      await client.query(
        'UPDATE password_resets SET consumed_at=NOW() WHERE user_id=$1 AND consumed_at IS NULL',
        [user.id],
      );
      await notify(client, {
        kind: 'PASSWORD_CHANGED',
        recipients: [user.id],
        eventKey: `password-changed:${consumed.rows[0].id}`,
      });
    });
    clearSessionCookie(res);
    res.json({ success: true, message: 'Password updated successfully.' });
  }),
);

router.get(
  '/emails/preview/:id',
  asyncHandler(async (req, res) => {
    if (
      env.NODE_ENV === 'production' ||
      env.ENABLE_DEV_AUTH_PREVIEWS !== 'true'
    )
      throw new HttpError(404, 'Email preview is unavailable');
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const preview = await readPreview(String(req.params.id), token);
    if (!preview) throw new HttpError(404, 'Email preview not found');
    res
      .type('html')
      .send(
        `<!doctype html><meta charset="utf-8"><title>${escapeHtml(preview.subject)}</title>${preview.html_body}`,
      );
  }),
);

router.get(
  '/emails/recent',
  authenticateToken,
  requireStaff,
  asyncHandler(async (_req, res) => {
    if (
      env.NODE_ENV === 'production' ||
      env.ENABLE_DEV_AUTH_PREVIEWS !== 'true'
    )
      throw new HttpError(404, 'Email previews are unavailable');
    const result = await query(
      `SELECT id,recipient,subject,delivery_status,created_at FROM email_outbox ORDER BY created_at DESC LIMIT 25`,
    );
    res.json(result.rows);
  }),
);

router.post(
  '/invitations/:id/revoke',
  authenticateToken,
  requireStaff,
  asyncHandler(async (req, res) => {
    const result = await query(
      "UPDATE invitations SET status='REVOKED' WHERE id=$1 AND status='DISPATCHED' RETURNING id",
      [req.params.id],
    );
    if (!result.rowCount) throw new HttpError(409, 'Invitation is not active');
    res.json({ success: true });
  }),
);

export default router;
