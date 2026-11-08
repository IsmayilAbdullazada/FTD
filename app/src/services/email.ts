import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { query } from "../config/db.js";

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const previewToken = crypto.randomBytes(24).toString("base64url");
  const inserted = await query(
    `INSERT INTO email_outbox(recipient,subject,text_body,html_body,preview_token_hash,delivery_status)
    VALUES($1,$2,$3,$4,$5,'QUEUED') RETURNING id`,
    [
      message.to,
      message.subject,
      message.text,
      message.html,
      sha256(previewToken),
    ],
  );
  const id = inserted.rows[0].id;
  let emailSent = false;
  let error: string | undefined;
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    try {
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      await transport.sendMail({ from: env.SMTP_FROM, ...message });
      emailSent = true;
      await query(
        `UPDATE email_outbox SET delivery_status='SENT' WHERE id=$1`,
        [id],
      );
    } catch (caught) {
      error =
        caught instanceof Error ? caught.message : "Email delivery failed";
      await query(
        `UPDATE email_outbox SET delivery_status='FAILED',delivery_error=$2 WHERE id=$1`,
        [id, error],
      );
    }
  }
  return {
    emailSent,
    emailError: error,
    previewUrl:
      env.NODE_ENV === "production"
        ? undefined
        : `/api/v1/auth/emails/preview/${id}?token=${previewToken}`,
  };
}

export async function readPreview(id: string, token: string) {
  const result = await query(
    `SELECT subject,html_body FROM email_outbox WHERE id=$1 AND preview_token_hash=$2`,
    [id, sha256(token)],
  );
  return result.rows[0];
}
