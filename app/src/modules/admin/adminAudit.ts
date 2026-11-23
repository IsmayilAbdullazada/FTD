import type { Request } from 'express';
import { query } from '../../config/db.js';
import { secretColumn, sensitiveColumn } from './adminRegistry.js';
export function auditSnapshot(value: unknown, table = ''): unknown {
  if (Array.isArray(value))
    return value.map((item) => auditSnapshot(item, table));
  if (value && typeof value === 'object' && !(value instanceof Date))
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !secretColumn(key) &&
            !/^(token|password|previewUrl|inviteUrl|invitationLink|resetLink|authorization|cookie)$/i.test(
              key,
            ),
        )
        .map(([key, v]) => [
          key,
          sensitiveColumn(table, key) ||
          /^(rawContent|sanitizedContent|phiAlerts|rejectionMessage|moderatorNotes)$/.test(
            key,
          ) ||
          (['posts', 'comments', 'private_messages'].includes(table) &&
            ['content', 'title'].includes(key))
            ? '[Redacted]'
            : auditSnapshot(v, table),
        ]),
    );
  return value;
}
export async function audit(
  req: Request,
  input: {
    action: string;
    table?: string;
    id?: string;
    summary: string;
    before?: unknown;
    after?: unknown;
    reason: string;
  },
) {
  const result = await query(
    `INSERT INTO admin_audit_log(actor_id,action,target_table,target_id,summary,before,after,reason,request_id,ip) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      req.user!.id,
      input.action,
      input.table || null,
      input.id || null,
      input.summary,
      JSON.stringify(auditSnapshot(input.before ?? null, input.table)),
      JSON.stringify(auditSnapshot(input.after ?? null, input.table)),
      input.reason,
      req.res?.locals.requestId || null,
      req.ip || null,
    ],
  );
  return result.rows[0].id as string;
}
