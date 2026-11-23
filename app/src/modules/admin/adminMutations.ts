import { agedOrphanUploads } from '../../services/uploads.js';
import type { Request } from 'express';
import { z } from 'zod';
import { query, transaction } from '../../config/db.js';
import { HttpError } from '../../lib/http.js';
import { notifyAdmins } from '../../services/notifications.js';
import {
  tableMetadata,
  registry,
  readRow,
  internalRow,
  masked,
  identifier,
  type Table,
} from './adminRegistry.js';
import { actions, cleanupOrphanFiles } from './maintenanceActions.js';
import { validateAction } from './domainActions.js';
import { validatedValues, writeDomainRow } from './domainData.js';
import { digest, signAdminToken, verifyAdminToken } from './adminTokens.js';
import { audit, auditSnapshot } from './adminAudit.js';
const record = z.record(z.string(), z.unknown());
const operation = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('data'),
      table: z.string(),
      mode: z.enum(['create', 'update', 'delete']),
      keys: z.array(record).max(200).default([]),
      values: record.default({}),
    })
    .strict(),
  z
    .object({
      kind: z.literal('action'),
      action: z.string(),
      args: record.default({}),
    })
    .strict(),
]);
export const intentSchema = z
  .object({ operation, reason: z.string().trim().min(10).max(1000) })
  .strict();
export type Intent = z.infer<typeof intentSchema>;
interface Snapshot {
  table: string;
  key: Record<string, unknown>;
  row: Record<string, unknown>;
}
export async function intentPlan(
  intent: Intent,
  lock = false,
  actorId?: string,
) {
  const op = intent.operation;
  let table: Table;
  let destructive: boolean;
  let snapshots: Snapshot[] = [];
  if (op.kind === 'data') {
    table = await tableMetadata(op.table);
    if (table.readOnly)
      throw new HttpError(
        403,
        'This table is read-only; use its dedicated maintenance action where available',
      );
    validatedValues(table, op.mode, op.values);
    if (op.mode === 'create' && op.keys.length)
      throw new HttpError(400, 'Create must not specify existing keys');
    if (op.mode !== 'create' && !op.keys.length)
      throw new HttpError(400, 'Select between 1 and 200 rows');
    for (const key of op.keys) {
      const row = await readRow(table, key, lock);
      if (internalRow(table, row))
        throw new HttpError(403, 'Internal security state is not editable');
      snapshots.push({ table: table.name, key, row });
    }
    if (internalRow(table, op.values))
      throw new HttpError(403, 'Internal security state is not editable');
    destructive = op.mode !== 'create' || table.name === 'users';
  } else {
    const def = actions.find((a) => a.id === op.action);
    if (!def) throw new HttpError(404, 'Unknown action');
    validateAction(def, op.args);
    table = await tableMetadata(def.table);
    destructive = def.destructive;
    const rootTable = op.action === 'private-reply' ? 'posts' : def.table;
    const rootMeta = await tableMetadata(rootTable);
    const id =
      op.args.id ??
      op.args.entityId ??
      (rootTable === 'posts' ? op.args.postId : undefined);
    if (rootMeta.primaryKey.length === 1 && id !== undefined) {
      const key = { [rootMeta.primaryKey[0]]: id };
      snapshots.push({
        table: rootMeta.name,
        key,
        row: await readRow(rootMeta, key, lock),
      });
    } else if (op.action === 'reassign-member') {
      const r = await query(
        'SELECT cohort_id,user_id FROM cohort_members WHERE user_id=$1 AND is_primary',
        [op.args.userId],
      );
      for (const row of r.rows) {
        const key = { cohort_id: row.cohort_id, user_id: row.user_id };
        snapshots.push({
          table: table.name,
          key,
          row: await readRow(table, key, lock),
        });
      }
    } else if (op.action === 'resend-email') {
      const key = { notification_id: op.args.notificationId };
      snapshots.push({
        table: table.name,
        key,
        row: await readRow(table, key, lock),
      });
    } else if (op.action === 'delete-orphan-uploads') {
      snapshots = (await agedOrphanUploads()).map((row) => ({
        table: table.name,
        key: { storage_name: row.storage_name },
        row,
      }));
    } else if (op.action === 'upvote-post' && actorId) {
      const rows = await query(
        'SELECT post_id,user_id,created_at FROM post_upvotes WHERE post_id=$1 AND user_id=$2',
        [op.args.id, actorId],
      );
      snapshots = rows.rows.map((row) => ({
        table: table.name,
        key: { post_id: row.post_id, user_id: row.user_id },
        row,
      }));
    } else if (
      op.action === 'purge-expired-invitations' ||
      op.action === 'purge-expired-resets'
    ) {
      const result = await query(
        `SELECT ${table.columns.map((c) => identifier(c.name)).join(',')} FROM ${identifier(table.name)} WHERE expires_at<NOW() ${table.name === 'invitations' ? "AND status<>'ACCEPTED'" : ''} ORDER BY expires_at LIMIT 200${lock ? ' FOR UPDATE' : ''}`,
      );
      snapshots = result.rows.map((row) => ({
        table: table.name,
        key: Object.fromEntries(table.primaryKey.map((k) => [k, row[k]])),
        row,
      }));
    }
  }
  const seen = new Set<string>();
  for (const snapshot of snapshots) {
    const key = snapshot.table + JSON.stringify(snapshot.key);
    if (seen.has(key))
      throw new HttpError(400, 'A row cannot be selected twice');
    seen.add(key);
  }
  return { table, destructive, snapshots };
}
export async function impact(snapshots: Snapshot[]) {
  const tables = await registry();
  const effects: Array<{ table: string; onDelete: string; count: number }> = [];
  for (const snapshot of snapshots)
    for (const child of tables)
      for (const fk of child.foreignKeys.filter(
        (f) => f.targetTable === snapshot.table,
      )) {
        const result = await query(
          `SELECT COUNT(*)::int count FROM ${identifier(child.name)} WHERE ${fk.columns.map((name, i) => `${identifier(name)}=$${i + 1}`).join(' AND ')}`,
          fk.targetColumns.map((name) => snapshot.row[name]),
        );
        if (result.rows[0].count)
          effects.push({
            table: child.name,
            onDelete: fk.onDelete,
            count: result.rows[0].count,
          });
      }
  return effects;
}
async function stateHashes(snapshots: Snapshot[]) {
  return snapshots.map((s) => ({
    table: s.table,
    key: s.key,
    hash: digest(s.row),
  }));
}
export async function previewMutation(req: Request, intent: Intent) {
  const plan = await intentPlan(intent, false, req.user!.id);
  const tables = await registry();
  const before = plan.snapshots.map((s) => ({
    table: s.table,
    key: s.key,
    values: masked(
      tables.find((t) => t.name === s.table)!,
      s.row,
    ),
  }));
  const op = intent.operation;
  const after =
    op.kind === 'data'
      ? plan.snapshots.length
        ? plan.snapshots.map((s) => ({
            table: s.table,
            key: s.key,
            values:
              op.mode === 'delete'
                ? plan.table.columns.some((c) => c.name === 'is_active')
                  ? { ...masked(plan.table, s.row), is_active: false }
                  : null
                : masked(plan.table, { ...s.row, ...op.values }),
          }))
        : [{ table: plan.table.name, values: masked(plan.table, op.values) }]
      : { action: op.action, arguments: op.args };
  // Action arguments can include clinical text; expose only the same masked representation as audit.
  const { auditSnapshot } = await import('./adminAudit.js');
  const previewToken = signAdminToken(
    {
      adminId: req.user!.id,
      sessionVersion: req.user!.sessionVersion,
      intentHash: digest(intent),
      states: await stateHashes(plan.snapshots),
    },
    'mutation',
    10,
  );
  return {
    table: plan.table.name,
    destructive: plan.destructive,
    rowsAffected: plan.snapshots.length || 1,
    before,
    after: auditSnapshot(after, plan.table.name),
    relationships: await impact(plan.snapshots),
    requiresPassword: plan.destructive && !(await hasRecentPassword(req)),
    previewToken,
  };
}
export async function hasRecentPassword(req: Request) {
  const key = `admin-reauth:${req.user!.id}:${req.user!.sessionVersion}`;
  const result = await query(
    "SELECT 1 FROM app_settings WHERE key=$1 AND updated_at>NOW()-INTERVAL '10 minutes'",
    [key],
  );
  return Boolean(result.rowCount);
}
export async function requireRecentPassword(req: Request) {
  if (!(await hasRecentPassword(req)))
    throw new HttpError(
      403,
      'Confirm your password before this change',
      'ADMIN_REAUTH_REQUIRED',
    );
}
export async function commitMutation(
  req: Request,
  intent: Intent,
  token: string,
  confirmation: string,
) {
  const claims = verifyAdminToken(token, 'mutation');
  if (
    claims.adminId !== req.user!.id ||
    claims.sessionVersion !== req.user!.sessionVersion ||
    claims.intentHash !== digest(intent)
  )
    throw new HttpError(
      409,
      'The proposed change has changed. Preview it again.',
    );
  let cleanupNames: string[] | undefined;
  const result = await transaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('ftdcare-admin-mutations'))",
    );
    const actor = (
      await client.query(
        'SELECT role,is_active,session_version FROM users WHERE id=$1 FOR SHARE',
        [req.user!.id],
      )
    ).rows[0];
    if (!actor?.is_active || actor.session_version !== req.user!.sessionVersion)
      throw new HttpError(
        401,
        'Your session has changed. Please sign in again.',
      );
    if (actor.role !== 'SYSTEM_ADMIN')
      throw new HttpError(403, 'Your administrator access is no longer active');
    if (typeof claims.jti !== 'string')
      throw new HttpError(
        403,
        'Preview authorization is incomplete. Preview the change again.',
      );
    const consumedKey = 'admin-intent-used:' + claims.jti;
    const consumed = await client.query(
      'SELECT value FROM app_settings WHERE key=$1',
      [consumedKey],
    );
    if (consumed.rowCount) {
      cleanupNames = consumed.rows[0].value.cleanupNames;
      return {
        success: true,
        auditId: String(consumed.rows[0].value.auditId),
        replayed: true,
      };
    }
    await client.query(
      "DELETE FROM app_settings WHERE key LIKE 'admin-intent-used:%' AND updated_at<NOW()-INTERVAL '1 day'",
    );
    const plan = await intentPlan(intent, true, req.user!.id);
    if (confirmation !== plan.table.name)
      throw new HttpError(400, 'Type the exact table name to confirm');
    if (
      JSON.stringify(claims.states) !==
      JSON.stringify(await stateHashes(plan.snapshots))
    )
      throw new HttpError(
        409,
        'These records changed after the preview. Refresh and preview again.',
      );
    if (plan.destructive) await requireRecentPassword(req);
    const op = intent.operation;
    let operationResult: unknown;
    if (op.kind === 'data') {
      const values = validatedValues(plan.table, op.mode, op.values);
      if (op.mode === 'create')
        operationResult = await writeDomainRow(
          req,
          plan.table,
          op.mode,
          {},
          values,
        );
      else
        for (const snapshot of plan.snapshots)
          await writeDomainRow(
            req,
            plan.table,
            op.mode,
            snapshot.key,
            values,
            snapshot.row,
          );
    } else {
      const action = actions.find((a) => a.id === op.action)!;
      operationResult = await action.execute(
        req,
        validateAction(action, op.args),
      );
      if (op.action === 'delete-orphan-uploads')
        cleanupNames = plan.snapshots.map((snapshot) =>
          String(snapshot.row.storage_name),
        );
    }
    const output = operationResult as
      | {
          id?: unknown;
          postId?: unknown;
          invitationId?: unknown;
          comment?: { id?: unknown };
          note?: { id?: unknown };
          rows?: Array<Record<string, unknown>>;
        }
      | undefined;
    const createdId =
      typeof operationResult === 'string'
        ? operationResult
        : (output?.id ??
          output?.postId ??
          output?.invitationId ??
          output?.comment?.id ??
          output?.note?.id ??
          output?.rows?.[0]?.id);
    const after: unknown[] = [];
    if (createdId && plan.table.primaryKey.length === 1) {
      try {
        after.push(
          await readRow(plan.table, { [plan.table.primaryKey[0]]: createdId }),
        );
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) throw error;
      }
    }

    for (const snapshot of plan.snapshots) {
      try {
        after.push(
          await readRow(await tableMetadata(snapshot.table), snapshot.key),
        );
      } catch (error) {
        if (error instanceof HttpError && error.status === 404)
          after.push(null);
        else throw error;
      }
    }
    const auditId = await audit(req, {
      action: op.kind === 'data' ? op.mode : op.action,
      table: plan.table.name,
      id: createdId
        ? String(createdId)
        : plan.snapshots.length === 1
          ? JSON.stringify(plan.snapshots[0].key)
          : undefined,
      summary: `${op.kind === 'data' ? op.mode : op.action}: ${plan.snapshots.length || 1} record(s)`,
      before: plan.snapshots.map((s) => auditSnapshot(s.row, s.table)),
      after: after.length ? after : op.kind === 'data' ? op.values : op.args,
      reason: intent.reason,
    });
    await client.query(
      'INSERT INTO app_settings(key,value,updated_at) VALUES($1,$2,NOW())',
      [consumedKey, JSON.stringify({ auditId, cleanupNames })],
    );
    if (plan.destructive)
      await notifyAdmins(client, {
        kind: 'ADMIN_CONSOLE_ACTION',
        actorId: req.user!.id,
        eventKey: `admin-action:${auditId}`,
        context: { auditId },
      });
    return { success: true, auditId };
  });
  if (cleanupNames)
    await transaction(async () => {
      const outcome = await cleanupOrphanFiles(undefined, cleanupNames);
      await audit(req, {
        action: 'UPLOAD_CLEANUP_RESULT',
        table: 'guide_uploads',
        summary: `Removed ${outcome.removed.length} approved unreferenced uploads${outcome.failed ? '; partial failure' : ''}`,
        after: outcome,
        reason: intent.reason,
      });
    });
  return result;
}
