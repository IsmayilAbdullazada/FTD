import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { query, transaction } from '../../config/db.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { requireRole } from '../../middleware/auth.js';
import { actions } from './maintenanceActions.js';
import {
  registry,
  tableMetadata,
  listRows,
  readRow,
  masked,
  internalRow,
} from './adminRegistry.js';
import {
  intentSchema,
  previewMutation,
  commitMutation,
} from './adminMutations.js';
import { signAdminToken } from './adminTokens.js';
import { audit } from './adminAudit.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadsDirectory, agedOrphanUploads } from '../../services/uploads.js';
const router = Router();
router.use(requireRole(['SYSTEM_ADMIN']));
router.use((_req, _res, next) => {
  if (env.ENABLE_ADMIN_CONSOLE !== 'true')
    return next(new HttpError(404, 'Admin console is disabled'));
  next();
});
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    keyGenerator: (req) => req.user!.id,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const reason = z.string().trim().min(10).max(1000);
router.get(
  '/registry',
  asyncHandler(async (_req, res) =>
    res.json({
      tables: await registry(),
      actions: actions.map(({ execute: _execute, ...action }) => action),
    }),
  ),
);
router.get(
  '/data/:table',
  asyncHandler(async (req, res) => {
    const i = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(50),
        search: z.string().max(200).optional(),
        sort: z.string().optional(),
        direction: z.enum(['asc', 'desc']).default('asc'),
        filters: z.string().max(4000).optional(),
      })
      .parse(req.query);
    let filters: Record<string, unknown> | undefined;
    try {
      filters = i.filters
        ? z.record(z.string(), z.unknown()).parse(JSON.parse(i.filters))
        : undefined;
    } catch {
      throw new HttpError(400, 'Invalid column filters');
    }
    res.json(
      await listRows(await tableMetadata(String(req.params.table)), {
        ...i,
        filters,
      }),
    );
  }),
);
router.get(
  '/data/:table/row',
  asyncHandler(async (req, res) => {
    const table = await tableMetadata(String(req.params.table));
    let key: Record<string, unknown>;
    try {
      key = z
        .record(z.string(), z.unknown())
        .parse(JSON.parse(String(req.query.key)));
    } catch {
      throw new HttpError(400, 'Invalid row key');
    }
    const row = await readRow(table, key);
    if (internalRow(table, row))
      throw new HttpError(403, 'Internal security state is private');
    res.json(masked(table, row));
  }),
);
router.get(
  '/data/:table/choices',
  asyncHandler(async (req, res) => {
    const table = await tableMetadata(String(req.params.table));
    const fk = table.foreignKeys.find((f) =>
      f.columns.includes(String(req.query.column)),
    );
    if (!fk) throw new HttpError(400, 'Choose a foreign-key column');
    const target = await tableMetadata(fk.targetTable);
    const label =
      target.columns.find((c) =>
        ['title', 'name', 'email', 'anonymous_handle', 'key'].includes(c.name),
      )?.name || target.primaryKey[0];
    const result = await listRows(target, {
      page: 1,
      pageSize: 25,
      search: String(req.query.search || '').slice(0, 200),
      sort: label,
    });
    res.json({
      choices: result.items.map((row) => ({
        key: row._key,
        value:
          row[fk.targetColumns[fk.columns.indexOf(String(req.query.column))]],
        label: String(row[label]),
      })),
    });
  }),
);
router.get(
  '/data/:table/export',
  asyncHandler(async (req, res) => {
    const table = await tableMetadata(String(req.params.table));
    const i = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(200).default(50),
        search: z.string().max(200).optional(),
      })
      .parse(req.query);
    const result = await listRows(table, i);
    const cell = (value: unknown) => {
      let text =
        typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      if (/^\s*[=+@\-\t\r\n]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${table.name}.csv"`,
    );
    res.send(
      [
        table.columns.map((c) => cell(c.name)).join(','),
        ...result.items.map((row) =>
          table.columns.map((c) => cell(row[c.name])).join(','),
        ),
      ].join('\r\n'),
    );
  }),
);
router.post(
  '/data/:table/reveal',
  asyncHandler(async (req, res) => {
    const i = z
      .object({ key: z.record(z.string(), z.unknown()), reason })
      .strict()
      .parse(req.body);
    const table = await tableMetadata(String(req.params.table));
    const row = await transaction(async () => {
      const row = await readRow(table, i.key);
      if (internalRow(table, row))
        throw new HttpError(403, 'Internal security state is private');
      await audit(req, {
        action: 'REVEAL',
        table: table.name,
        id: JSON.stringify(i.key),
        summary: 'Revealed protected row text',
        reason: i.reason,
      });
      return row;
    });
    res.json(masked(table, row, true));
  }),
);
router.post(
  '/reauthenticate',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.user!.id,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  asyncHandler(async (req, res) => {
    const { password } = z
      .object({ password: z.string().min(1).max(128) })
      .strict()
      .parse(req.body);
    const user = (
      await query('SELECT password_hash FROM users WHERE id=$1', [req.user!.id])
    ).rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw new HttpError(403, 'Password confirmation failed');
    await query(
      "INSERT INTO app_settings(key,value,updated_at) VALUES($1,'true',NOW()) ON CONFLICT(key) DO UPDATE SET value='true',updated_at=NOW()",
      [`admin-reauth:${req.user!.id}:${req.user!.sessionVersion}`],
    );
    res.json({ success: true, validForSeconds: 600 });
  }),
);
router.post(
  '/mutations/preview',
  asyncHandler(async (req, res) =>
    res.json(await previewMutation(req, intentSchema.parse(req.body))),
  ),
);
router.post(
  '/mutations/commit',
  asyncHandler(async (req, res) => {
    const i = z
      .object({
        intent: intentSchema,
        previewToken: z.string().min(1).max(100000),
        confirmation: z.string(),
      })
      .strict()
      .parse(req.body);
    res.json(
      await commitMutation(req, i.intent, i.previewToken, i.confirmation),
    );
  }),
);
router.post(
  '/preview',
  asyncHandler(async (req, res) => {
    const i = z
      .object({ targetUserId: z.string().min(1), reason })
      .strict()
      .parse(req.body);
    const target = (
      await query(
        "SELECT id,first_name,last_name,anonymous_handle,role FROM users WHERE id=$1 AND is_active AND role IN ('CARE_PARTNER','CLINICIAN_MODERATOR')",
        [i.targetUserId],
      )
    ).rows[0];
    if (!target)
      throw new HttpError(404, 'Choose an active moderator or care partner');
    await transaction(() =>
      audit(req, {
        action: 'PREVIEW_START',
        table: 'users',
        id: target.id,
        summary: 'Started read-only role preview',
        reason: i.reason,
      }),
    );
    res.json({
      token: signAdminToken(
        {
          adminId: req.user!.id,
          sessionVersion: req.user!.sessionVersion,
          targetId: target.id,
        },
        'preview',
        30,
      ),
      target: {
        id: target.id,
        name:
          target.role === 'CARE_PARTNER'
            ? target.anonymous_handle
            : target.first_name + ' ' + target.last_name,
        role: target.role,
      },
      expiresInSeconds: 1800,
    });
  }),
);
router.get(
  '/preview-users',
  asyncHandler(async (req, res) => {
    const term = z
      .string()
      .max(100)
      .parse(String(req.query.search || ''));
    const role = z
      .enum(['CARE_PARTNER', 'CLINICIAN_MODERATOR'])
      .parse(req.query.role);
    const result = await query(
      "SELECT id,first_name,last_name,anonymous_handle,email,role FROM users WHERE is_active AND role=$1 AND (first_name||' '||last_name||' '||email||' '||anonymous_handle) ILIKE $2 ORDER BY last_name,id LIMIT 25",
      [role, '%' + term.replace(/[\\%_]/g, '\\$&') + '%'],
    );
    res.json({ users: result.rows });
  }),
);
router.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const i = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(req.query);
    res.json(
      await listRows(await tableMetadata('admin_audit_log'), {
        ...i,
        sort: 'created_at',
        direction: 'desc',
      }),
    );
  }),
);
router.get(
  '/diagnostics',
  asyncHandler(async (_req, res) => {
    const guides = await query(
      "SELECT id,title,status,is_active,total_chunks,array_length(regexp_split_to_array(trim(content),'\\s+'),1) word_count FROM chatbot_guides ORDER BY created_at DESC",
    );
    const registered = await query(
      "SELECT u.storage_name,u.created_at FROM guide_uploads u WHERE NOT EXISTS(SELECT 1 FROM chatbot_guides g WHERE g.pdf_url='/uploads/guides/'||u.storage_name) AND NOT EXISTS(SELECT 1 FROM resources r WHERE r.file_attachment_url='/uploads/guides/'||u.storage_name) ORDER BY u.created_at LIMIT 200",
    );
    const uploads: Array<{
      name: string;
      bytes?: number;
      eligibleForCleanup?: boolean;
      missing?: boolean;
    }> = [];
    for (const row of registered.rows) {
      try {
        const stat = await fs.stat(
          path.join(uploadsDirectory, path.basename(row.storage_name)),
        );
        uploads.push({
          name: row.storage_name,
          bytes: stat.size,
          eligibleForCleanup: Date.now() - stat.mtimeMs >= 86400000,
        });
      } catch {
        uploads.push({ name: row.storage_name, missing: true });
      }
    }
    const indexes = await query(
      "SELECT tablename,indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname",
    );
    res.json({
      guides: guides.rows,
      orphanUploads: [
        ...uploads,
        ...(await agedOrphanUploads())
          .filter(
            (file) =>
              !uploads.some((upload) => upload.name === file.storage_name),
          )
          .map((file) => ({
            name: file.storage_name,
            bytes: file._file_bytes,
            eligibleForCleanup: true,
            registered: false,
          })),
      ],
      indexes: indexes.rows,
    });
  }),
);
export default router;
