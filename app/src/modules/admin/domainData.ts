import type { Request } from 'express';
import { query } from '../../config/db.js';
import { HttpError } from '../../lib/http.js';
import { domainActions } from './domainActions.js';
import { createAccount, updateAccount } from './accountAdministration.js';
import { identifier, type Table } from './adminRegistry.js';

export type MutationMode = 'create' | 'update' | 'delete';
const camel = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const actorFields = new Set([
  'author_id',
  'sender_id',
  'created_by',
  'uploaded_by',
  'moderated_by',
  'approved_by',
  'closed_by',
  'issued_by',
]);
export function validatedValues(
  table: Table,
  mode: MutationMode,
  values: Record<string, unknown>,
) {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(values)) {
    const column = table.columns.find((c) => c.name === name);
    if (!column || column.readOnly || actorFields.has(name))
      throw new HttpError(400, `${name} is not editable`);
    if (value === null) {
      if (!column.nullable) throw new HttpError(400, `${name} cannot be null`);
      result[name] = null;
      continue;
    }
    if (column.type === 'boolean' && typeof value !== 'boolean')
      throw new HttpError(400, `${name} must be a boolean`);
    if (
      [
        'integer',
        'bigint',
        'smallint',
        'numeric',
        'double precision',
        'real',
      ].includes(column.type) &&
      (typeof value !== 'number' || !Number.isFinite(value))
    )
      throw new HttpError(400, `${name} must be a number`);
    if (column.enumValues && !column.enumValues.includes(String(value)))
      throw new HttpError(400, `Invalid ${name}`);
    if (
      ![
        'json',
        'jsonb',
        'ARRAY',
        'boolean',
        'integer',
        'bigint',
        'smallint',
        'numeric',
        'double precision',
        'real',
      ].includes(column.type) &&
      (typeof value !== 'string' || value.length > 20000)
    )
      throw new HttpError(400, `${name} must be text up to 20,000 characters`);
    if (mode === 'update' && table.primaryKey.includes(name))
      throw new HttpError(400, 'Primary keys cannot be changed');
    result[name] = value;
  }
  if (mode !== 'delete' && !Object.keys(result).length)
    throw new HttpError(400, 'Supply at least one change');
  return result;
}
async function run(req: Request, id: string, args: Record<string, unknown>) {
  const action = domainActions.find((action) => action.id === id);
  if (!action) throw new Error('Missing domain operation ' + id);
  return action.execute(req, args);
}
function mapped(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => [camel(key), value]),
  );
}
export async function writeDomainRow(
  req: Request,
  table: Table,
  mode: MutationMode,
  key: Record<string, unknown>,
  values: Record<string, unknown>,
  before?: Record<string, unknown>,
) {
  const v = { ...before, ...values };
  const data = mapped(v);
  const id = String(key.id || '');
  switch (table.name) {
    case 'users':
      if (mode === 'create') return createAccount(req, values);
      return updateAccount(
        req,
        id,
        mode === 'delete' ? { is_active: false } : values,
      );
    case 'posts': {
      if (mode === 'delete') return run(req, 'delete-post', { id });
      if (mode === 'create')
        return run(req, 'create-post', {
          title: v.title,
          content: v.raw_content ?? v.sanitized_content,
          targetCohortId: values.target_cohort_id || 'group-general',
        });
      if (
        ['title', 'raw_content', 'sanitized_content'].some((field) =>
          Object.hasOwn(values, field),
        )
      )
        await run(req, 'edit-post', {
          id,
          title: v.title,
          content:
            values.sanitized_content ??
            values.raw_content ??
            before?.raw_content,
        });
      if (Object.hasOwn(values, 'is_closed'))
        await run(req, 'close-post', { id, isClosed: values.is_closed });
      if (Object.hasOwn(values, 'allow_unmoderated_replies'))
        await run(req, 'reply-policy', {
          id,
          allowUnmoderatedReplies: values.allow_unmoderated_replies,
        });
      if (values.status && values.status !== before?.status)
        await run(req, 'moderate-post', {
          entityId: id,
          action:
            values.status === 'APPROVED'
              ? 'APPROVE'
              : values.status === 'REJECTED'
                ? 'REJECT'
                : 'CLINICAL_REDIRECT',
          rejectionCode: values.rejection_code || 'OTHER',
          rejectionMessage: values.rejection_message || undefined,
          condition: values.condition || undefined,
        });
      const unsupported = Object.keys(values).filter(
        (k) =>
          ![
            'title',
            'raw_content',
            'sanitized_content',
            'is_closed',
            'allow_unmoderated_replies',
            'status',
            'rejection_code',
            'rejection_message',
            'condition',
          ].includes(k),
      );
      if (unsupported.length)
        throw new HttpError(
          400,
          'Use the discussion actions for these fields: ' +
            unsupported.join(', '),
        );
      if (values.condition && values.condition !== before?.condition)
        await query(
          'UPDATE posts SET condition=$1,updated_at=NOW() WHERE id=$2',
          [values.condition, id],
        );
      return;
    }
    case 'comments':
      if (mode === 'delete')
        return run(req, 'delete-comment', { id, postId: before?.post_id });
      if (mode === 'create')
        return run(req, 'create-comment', {
          postId: v.post_id,
          parentCommentId: v.parent_comment_id || undefined,
          content: v.raw_content ?? v.sanitized_content,
        });
      if (
        values.raw_content !== undefined ||
        values.sanitized_content !== undefined
      )
        await run(req, 'edit-comment', {
          id,
          postId: before?.post_id,
          content: values.sanitized_content ?? values.raw_content,
        });
      if (values.status && values.status !== before?.status)
        await run(req, 'moderate-comment', {
          entityId: id,
          action: values.status === 'APPROVED' ? 'APPROVE' : 'REJECT',
          rejectionCode: values.rejection_code || 'OTHER',
          rejectionMessage: values.rejection_message || undefined,
        });
      if (
        Object.keys(values).some(
          (k) =>
            ![
              'raw_content',
              'sanitized_content',
              'status',
              'rejection_code',
              'rejection_message',
            ].includes(k),
        )
      )
        throw new HttpError(400, 'Use the reply actions to change this field');
      return;
    case 'chatbot_guides':
      if (mode === 'delete') return run(req, 'delete-guide', { id });
      if (mode === 'create')
        return run(req, 'create-guide', {
          ...data,
          fileName: v.file_name,
          year: v.publication_year,
        });
      return domainActions
        .find((a) => a.id === 'edit-guide')!
        .execute(req, { ...mapped(values), id, year: values.publication_year });
    case 'resources':
      return run(
        req,
        mode === 'create'
          ? 'create-resource'
          : mode === 'update'
            ? 'edit-resource'
            : 'delete-resource',
        { ...data, id: mode === 'create' ? undefined : id },
      );
    case 'clinic_updates':
    case 'calendar_events': {
      const kind = table.name === 'clinic_updates' ? 'update' : 'event';
      if (mode === 'create' || mode === 'delete')
        return run(req, (mode === 'create' ? 'create-' : 'delete-') + kind, {
          ...data,
          id: mode === 'create' ? undefined : id,
        });
      return updateContentRecord(table, values, id);
    }
    case 'cohorts':
      if (mode === 'create') return run(req, 'create-cohort', data);
      if (
        (mode === 'delete' || values.is_active === false) &&
        before?.is_general_board
      )
        throw new HttpError(
          409,
          'The general community board must remain active',
        );
      if (mode === 'delete' || values.is_active === false) {
        const primary = await query(
          'SELECT 1 FROM cohort_members WHERE cohort_id=$1 AND is_primary LIMIT 1',
          [id],
        );
        if (primary.rowCount)
          throw new HttpError(
            409,
            'Reassign primary members before deactivating this group',
          );
        return plainWrite(table, 'update', key, { is_active: false });
      }
      return plainWrite(table, mode, key, values);
    case 'cohort_members': {
      const userId = String(key.user_id || values.user_id),
        cohortId = String(values.cohort_id || key.cohort_id);
      if (mode === 'delete' && before?.is_primary)
        throw new HttpError(
          409,
          'Reassign this primary membership before deleting it',
        );
      if (values.is_primary === true)
        await run(req, 'reassign-member', { userId, newGroupId: cohortId });
      else if (values.is_primary === false && before?.is_primary)
        throw new HttpError(
          409,
          'Use Reassign primary community group to preserve one primary membership',
        );
      if (values.is_primary === true) {
        if (values.status !== undefined)
          await query(
            'UPDATE cohort_members SET status=$1 WHERE cohort_id=$2 AND user_id=$3',
            [values.status, cohortId, userId],
          );
        return;
      }
      return plainWrite(table, mode, key, values);
    }
    case 'invitations':
      if (mode === 'delete') return run(req, 'revoke-invitation', { id });
      if (mode === 'update') {
        if (before?.status === 'ACCEPTED')
          throw new HttpError(409, 'Accepted invitations cannot be changed');
        await run(req, 'revoke-invitation', { id });
      }
      return run(req, 'create-invitation', data);
    case 'moderator_private_notes':
      if (mode === 'create')
        return run(req, 'private-reply', {
          postId: v.post_id,
          message: v.message,
          action: 'KEEP_PENDING',
        });
      return plainWrite(table, mode, key, values);
    case 'private_messages':
      if (mode === 'create')
        return run(req, 'private-message', {
          caregiverId: v.recipient_id,
          content: v.content,
        });
      return plainWrite(table, mode, key, values);
    case 'post_groups': {
      const postId = String(key.post_id || values.post_id),
        cohortId = String(key.cohort_id || values.cohort_id);
      if (mode === 'delete') {
        const count = (
          await query(
            'SELECT COUNT(*)::int count FROM post_groups WHERE post_id=$1',
            [postId],
          )
        ).rows[0].count;
        if (count <= 1)
          throw new HttpError(
            409,
            'A discussion must belong to at least one group',
          );
      } else if (
        !(
          await query('SELECT 1 FROM cohorts WHERE id=$1 AND is_active', [
            cohortId,
          ])
        ).rowCount
      )
        throw new HttpError(400, 'Choose an active group');
      await query('SELECT id FROM posts WHERE id=$1 FOR UPDATE', [postId]);
      return plainWrite(table, mode, key, values);
    }
    default:
      return plainWrite(table, mode, key, values);
  }
}
async function updateContentRecord(
  table: Table,
  values: Record<string, unknown>,
  id: string,
) {
  const allowed =
    table.name === 'clinic_updates'
      ? [
          'title',
          'summary',
          'body',
          'category',
          'condition',
          'trial_status',
          'external_url',
        ]
      : ['title', 'type', 'starts_at', 'location', 'description', 'condition'];
  if (Object.keys(values).some((key) => !allowed.includes(key)))
    throw new HttpError(400, 'Unsupported content field');
  for (const name of ['external_url'])
    if (
      values[name] &&
      (!/^https?:\/\//i.test(String(values[name])) ||
        new URL(String(values[name])).username)
    )
      throw new HttpError(400, 'Use a public HTTP or HTTPS URL');
  return plainWrite(table, 'update', { id }, values);
}
export async function plainWrite(
  table: Table,
  mode: MutationMode,
  key: Record<string, unknown>,
  values: Record<string, unknown>,
) {
  const entries = Object.entries(values);
  if (mode === 'create')
    return query(
      `INSERT INTO ${identifier(table.name)}(${entries.map(([name]) => identifier(name)).join(',')}) VALUES(${entries.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING ${table.primaryKey.map(identifier).join(',')}`,
      [
        ...entries.map(([name, value]) =>
          ['json', 'jsonb'].includes(
            table.columns.find((c) => c.name === name)!.type,
          )
            ? JSON.stringify(value)
            : value,
        ),
      ],
    );
  const keys = table.primaryKey.map((name) => key[name]);
  const where = table.primaryKey
    .map((name, i) => `${identifier(name)}=$${entries.length + i + 1}`)
    .join(' AND ');
  if (mode === 'delete')
    return query(
      `DELETE FROM ${identifier(table.name)} WHERE ${table.primaryKey.map((name, i) => `${identifier(name)}=$${i + 1}`).join(' AND ')}`,
      keys,
    );
  return query(
    `UPDATE ${identifier(table.name)} SET ${entries.map(([name], i) => `${identifier(name)}=$${i + 1}`).join(',')} WHERE ${where}`,
    [
      ...entries.map(([name, value]) =>
        ['json', 'jsonb'].includes(
          table.columns.find((c) => c.name === name)!.type,
        )
          ? JSON.stringify(value)
          : value,
      ),
      ...keys,
    ],
  );
}
