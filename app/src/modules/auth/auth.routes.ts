import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env.js";
import { query, transaction } from "../../config/db.js";
import { asyncHandler, HttpError } from "../../lib/http.js";
import { currentUser } from "../../lib/serializers.js";
import { readPreview, sendEmail } from "../../services/email.js";
import { authenticateToken, requireStaff } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { clearSessionCookie, setSessionCookie } from "../../lib/session.js";

const router = Router();
const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const tokenFor = (user: any) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionVersion: user.session_version,
    },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      issuer: "ftdcare-api",
      audience: "ftdcare-web",
    },
  );

router.post(
  "/login",
  authLimiter,
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
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw new HttpError(401, "Invalid email, Clinic Patient ID, or password");
    const token = tokenFor(user);
    setSessionCookie(res, token, rememberMe);
    res.json({
      success: true,
      ...(env.NODE_ENV === "test" ? { token } : {}),
      user: currentUser(user),
    });
  }),
);

router.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

router.post(
  "/invitations",
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
        condition: z.enum(["FTD", "AD"]),
        phoneNumber: z.string().trim().optional(),
      })
      .parse(req.body);
    const token = crypto.randomBytes(32).toString("base64url");
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
    const registrationUrl = `${env.APP_URL.replace(/\/$/, "")}/register?token=${encodeURIComponent(token)}`;
    const delivery = await sendEmail({
      to: input.email,
      subject: "Your Hopkins Care Partner Connect invitation",
      text: `You have been invited to Hopkins Care Partner Connect. Register: ${registrationUrl}`,
      html: `<p>You have been invited to Hopkins Care Partner Connect.</p><p><a href="${escapeHtml(registrationUrl)}">Create your account</a></p>`,
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
  "/invitations/:token",
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT email,first_name,last_name,condition,primary_cohort_slug,status,expires_at FROM invitations WHERE token_hash=$1`,
      [sha256(String(req.params.token))],
    );
    const invitation = result.rows[0];
    if (
      !invitation ||
      invitation.status !== "DISPATCHED" ||
      new Date(invitation.expires_at) <= new Date()
    ) {
      throw new HttpError(404, "Invitation not found or expired");
    }
    res.json({
      valid: true,
      invitation: {
        email: invitation.email,
        firstName: invitation.first_name ?? "",
        lastName: invitation.last_name ?? "",
        condition: invitation.condition,
        primaryCohortSlug: invitation.primary_cohort_slug,
      },
    });
  }),
);

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        token: z.string().min(20),
        password: z.string().min(8).max(128),
        anonymousHandle: z.string().trim().min(3).max(40),
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
        invite.status !== "DISPATCHED" ||
        new Date(invite.expires_at) <= new Date()
      )
        throw new HttpError(400, "Invitation not found or expired");
      const id = `user-care-${crypto.randomUUID()}`;
      const inserted = await client.query(
        `INSERT INTO users(id,email,password_hash,role,first_name,last_name,phone_number,clinic_patient_id,condition,anonymous_handle,avatar_color,badge_label)
       VALUES($1,$2,$3,'CARE_PARTNER',$4,$5,$6,$7,$8,$9,'#1E40AF','Care Partner') RETURNING *`,
        [
          id,
          invite.email,
          passwordHash,
          input.firstName || invite.first_name || "Care",
          input.lastName || invite.last_name || "Partner",
          input.phoneNumber || invite.phone_number,
          invite.clinic_patient_id,
          invite.condition,
          input.anonymousHandle,
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
      return inserted.rows[0];
    });
    const token = tokenFor(user);
    setSessionCookie(res, token, true);
    res.status(201).json({
      success: true,
      ...(env.NODE_ENV === "test" ? { token } : {}),
      user: currentUser(user),
    });
  }),
);

router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const found = await query(
      `SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND is_active`,
      [email],
    );
    const generic = {
      success: true,
      message: "If that account exists, a reset code has been issued.",
    };
    if (!found.rows[0]) {
      res.json(generic);
      return;
    }
    const resetToken = crypto.randomBytes(32).toString("base64url");
    const code = String(crypto.randomInt(100000, 1_000_000));
    const resetUrl = `${env.APP_URL.replace(/\/$/, "")}/?tab=reset-password&email=${encodeURIComponent(email)}&resetToken=${encodeURIComponent(resetToken)}`;
    await query(
      `DELETE FROM password_resets WHERE user_id=$1 AND consumed_at IS NULL`,
      [found.rows[0].id],
    );
    await query(
      `INSERT INTO password_resets(user_id,token_hash,code_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '20 minutes')`,
      [found.rows[0].id, sha256(resetToken), await bcrypt.hash(code, 10)],
    );
    const delivery = await sendEmail({
      to: email,
      subject: "Hopkins Care Partner Connect password reset",
      text: `Open this password reset link: ${resetUrl}\n\nYour verification code is ${code}. Both expire in 20 minutes.`,
      html: `<p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>Your verification code is <strong>${escapeHtml(code)}</strong>.</p><p>Both expire in 20 minutes.</p>`,
    });
    res.json(
      env.NODE_ENV === "production"
        ? { ...generic, requiresEmailLink: true }
        : {
            ...generic,
            ...delivery,
            resetToken,
            testCode: code,
            requiresEmailLink: false,
          },
    );
  }),
);

router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        email: z.string().email(),
        code: z.string().regex(/^\d{6}$/),
        token: z.string().min(20),
        newPassword: z.string().min(8).max(128),
      })
      .parse(req.body);
    const reset = await query(
      `SELECT pr.*,u.email FROM password_resets pr JOIN users u ON u.id=pr.user_id
     WHERE pr.token_hash=$1 AND LOWER(u.email)=LOWER($2) AND pr.consumed_at IS NULL AND pr.expires_at>NOW()`,
      [sha256(input.token), input.email],
    );
    const record = reset.rows[0];
    if (!record || !(await bcrypt.compare(input.code, record.code_hash)))
      throw new HttpError(400, "Reset code is invalid or expired");
    await transaction(async (client) => {
      await client.query(
        `UPDATE users SET password_hash=$1,session_version=session_version+1,updated_at=NOW() WHERE id=$2`,
        [await bcrypt.hash(input.newPassword, 12), record.user_id],
      );
      await client.query(
        `UPDATE password_resets SET consumed_at=NOW() WHERE id=$1`,
        [record.id],
      );
    });
    res.json({ success: true, message: "Password updated successfully." });
  }),
);

router.get(
  "/emails/preview/:id",
  asyncHandler(async (req, res) => {
    if (env.NODE_ENV === "production")
      throw new HttpError(404, "Email preview is unavailable");
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const preview = await readPreview(String(req.params.id), token);
    if (!preview) throw new HttpError(404, "Email preview not found");
    res
      .type("html")
      .send(
        `<!doctype html><meta charset="utf-8"><title>${escapeHtml(preview.subject)}</title>${preview.html_body}`,
      );
  }),
);

router.get(
  "/emails/recent",
  authenticateToken,
  requireStaff,
  asyncHandler(async (_req, res) => {
    if (env.NODE_ENV === "production")
      throw new HttpError(404, "Email previews are unavailable");
    const result = await query(
      `SELECT id,recipient,subject,delivery_status,created_at FROM email_outbox ORDER BY created_at DESC LIMIT 25`,
    );
    res.json(result.rows);
  }),
);

export default router;
