import { query } from '../../config/db.js';
import { HttpError } from '../../lib/http.js';

export const TABLES = [
  'users',
  'care_partner_profiles',
  'cohorts',
  'cohort_members',
  'invitations',
  'posts',
  'post_groups',
  'post_upvotes',
  'comments',
  'moderator_private_notes',
  'private_messages',
  'moderation_audit',
  'notifications',
  'notification_email_jobs',
  'email_outbox',
  'password_resets',
  'password_recovery_jobs',
  'chatbot_guides',
  'guide_chunks',
  'guide_uploads',
  'resources',
  'clinic_updates',
  'calendar_events',
  'app_settings',
  'schema_migrations',
  'policy_acknowledgments',
  'admin_audit_log',
] as const;
const protectedTables = new Set([
  'care_partner_profiles',
  'schema_migrations',
  'email_outbox',
  'password_resets',
  'password_recovery_jobs',
  'notification_email_jobs',
  'guide_chunks',
  'policy_acknowledgments',
  'admin_audit_log',
  'moderation_audit',
  'guide_uploads',
]);
export const secretColumn = (name: string) =>
  /password_hash|token_hash|preview_token_hash/i.test(name);
export const sensitiveColumn = (table: string, name: string) =>
  ['raw_content', 'sanitized_content', 'phi_alerts'].includes(name) ||
  (table === 'private_messages' && name === 'content') ||
  (table === 'moderator_private_notes' && name === 'message') ||
  (table === 'care_partner_profiles' &&
    [
      'patient_age',
      'care_partner_age',
      'relationship_to_patient',
      'county',
      'state',
    ].includes(name));
export function identifier(value: string) {
  return '"' + value.replaceAll('"', '""') + '"';
}
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  readOnly: boolean;
  sensitive: boolean;
  enumValues?: string[];
}
export interface ForeignKey {
  columns: string[];
  targetTable: string;
  targetColumns: string[];
  onDelete: string;
}
export interface Table {
  name: string;
  readOnly: boolean;
  columns: Column[];
  primaryKey: string[];
  foreignKeys: ForeignKey[];
}
export async function registry(): Promise<Table[]> {
  const cols = await query(
    `SELECT table_name,column_name,data_type,is_nullable,column_default,is_generated FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`,
    [TABLES],
  );
  const constraints = await query(
    `SELECT t.relname AS table_name,c.contype,pg_get_constraintdef(c.oid) AS definition,
   ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord) AS columns,
   rt.relname AS target_table,ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS target_columns,c.confdeltype
   FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=t.relnamespace LEFT JOIN pg_class rt ON rt.oid=c.confrelid WHERE ns.nspname='public' AND t.relname=ANY($1::text[])`,
    [TABLES],
  );
  return TABLES.filter((name) =>
    cols.rows.some((c) => c.table_name === name),
  ).map((name) => {
    const checks = constraints.rows.filter((c) => c.table_name === name);
    return {
      name,
      readOnly: protectedTables.has(name),
      primaryKey: checks.find((c) => c.contype === 'p')?.columns || [],
      columns: cols.rows
        .filter((c) => c.table_name === name && !secretColumn(c.column_name))
        .map((c) => {
          const check = checks.find(
            (check) =>
              check.contype === 'c' &&
              check.columns.length === 1 &&
              check.columns[0] === c.column_name &&
              /ANY/.test(check.definition),
          );
          const enumValues = check
            ? [...String(check.definition).matchAll(/'([^']*)'/g)].map(
                (m) => m[1],
              )
            : undefined;
          return {
            name: c.column_name,
            type: c.data_type,
            nullable: c.is_nullable === 'YES',
            defaultValue: c.column_default,
            readOnly:
              c.column_name === 'id' ||
              c.column_name === 'session_version' ||
              [
                'created_at',
                'updated_at',
                'moderated_at',
                'approved_at',
                'closed_at',
                'accepted_at',
                'joined_at',
                'acknowledged_at',
                'consumed_at',
                'read_at',
              ].includes(c.column_name) ||
              c.column_name === 'total_chunks' ||
              (name === 'chatbot_guides' &&
                ['file_name', 'file_size', 'mime_type'].includes(
                  c.column_name,
                )) ||
              [
                'author_id',
                'sender_id',
                'created_by',
                'uploaded_by',
                'moderated_by',
                'approved_by',
                'closed_by',
                'issued_by',
              ].includes(c.column_name) ||
              (['posts', 'comments'].includes(name) &&
                ['phi_alerts', 'is_urgent_clinical'].includes(c.column_name)) ||
              c.is_generated === 'ALWAYS',
            sensitive: sensitiveColumn(name, c.column_name),
            ...(enumValues ? { enumValues } : {}),
          };
        }),
      foreignKeys: checks
        .filter((c) => c.contype === 'f')
        .map((c) => ({
          columns: c.columns,
          targetTable: c.target_table,
          targetColumns: c.target_columns,
          onDelete: (
            {
              a: 'NO ACTION',
              r: 'RESTRICT',
              c: 'CASCADE',
              n: 'SET NULL',
              d: 'SET DEFAULT',
            } as Record<string, string>
          )[c.confdeltype],
        })),
    };
  });
}
export async function tableMetadata(name: string) {
  const table = (await registry()).find((t) => t.name === name);
  if (!table) throw new HttpError(404, 'Unknown table');
  return table;
}
export function masked(
  table: Table,
  row: Record<string, unknown>,
  reveal = false,
) {
  return Object.fromEntries(
    table.columns
      .filter((c) => Object.hasOwn(row, c.name))
      .map((c) => [
        c.name,
        c.sensitive && !reveal && row[c.name] != null
          ? '[Hidden — reveal to inspect]'
          : row[c.name],
      ]),
  );
}
export function rowKey(table: Table, row: Record<string, unknown>) {
  return Object.fromEntries(table.primaryKey.map((key) => [key, row[key]]));
}
export function keyPredicate(
  table: Table,
  key: Record<string, unknown>,
  offset = 0,
) {
  if (
    !table.primaryKey.length ||
    Object.keys(key).length !== table.primaryKey.length ||
    table.primaryKey.some(
      (column) => key[column] === undefined || key[column] === null,
    )
  )
    throw new HttpError(400, 'Supply the complete primary key');
  return {
    sql: table.primaryKey
      .map((column, i) => `${identifier(column)}=$${i + 1 + offset}`)
      .join(' AND '),
    values: table.primaryKey.map((column) => key[column]),
  };
}
export async function readRow(
  table: Table,
  key: Record<string, unknown>,
  lock = false,
) {
  const predicate = keyPredicate(table, key);
  const result = await query(
    `SELECT ${table.columns.map((c) => identifier(c.name)).join(',')} FROM ${identifier(table.name)} WHERE ${predicate.sql}${lock ? ' FOR UPDATE' : ''}`,
    predicate.values,
  );
  if (!result.rowCount) throw new HttpError(404, 'Row not found');
  return result.rows[0] as Record<string, unknown>;
}
export function internalRow(table: Table, row: Record<string, unknown>) {
  return (
    table.name === 'app_settings' &&
    /^(auth-fail:|admin-)/.test(String(row.key))
  );
}
export async function listRows(
  table: Table,
  input: {
    page: number;
    pageSize: number;
    search?: string;
    sort?: string;
    direction?: string;
    filters?: Record<string, unknown>;
  },
) {
  const values: unknown[] = [];
  const clauses: string[] = [];
  if (table.name === 'app_settings')
    clauses.push("key NOT LIKE 'auth-fail:%' AND key NOT LIKE 'admin-%'");
  if (input.search) {
    values.push('%' + input.search.replace(/[\\%_]/g, '\\$&') + '%');
    const fields = table.columns.filter((c) => !c.sensitive);
    clauses.push(
      '(' +
        fields
          .map((c) => `${identifier(c.name)}::text ILIKE $${values.length}`)
          .join(' OR ') +
        ')',
    );
  }
  for (const [name, value] of Object.entries(input.filters || {})) {
    const column = table.columns.find((c) => c.name === name && !c.sensitive);
    if (!column) throw new HttpError(400, 'Unknown or protected filter');
    if (value === null) clauses.push(`${identifier(name)} IS NULL`);
    else {
      values.push(value);
      clauses.push(`${identifier(name)}=$${values.length}`);
    }
  }
  const sort = input.sort || table.primaryKey[0] || table.columns[0].name;
  if (!table.columns.some((c) => c.name === sort && !c.sensitive))
    throw new HttpError(400, 'Unknown or protected sort column');
  const where = clauses.length
    ? ' WHERE ' + clauses.map((c) => '(' + c + ')').join(' AND ')
    : '';
  const total = await query(
    `SELECT COUNT(*)::int count FROM ${identifier(table.name)}${where}`,
    values,
  );
  const rows = await query(
    `SELECT ${table.columns.map((c) => identifier(c.name)).join(',')} FROM ${identifier(table.name)}${where} ORDER BY ${identifier(sort)} ${input.direction === 'desc' ? 'DESC' : 'ASC'} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, input.pageSize, (input.page - 1) * input.pageSize],
  );
  return {
    items: rows.rows.map(
      (row): Record<string, unknown> & { _key: Record<string, unknown> } => ({
        ...masked(table, row),
        _key: rowKey(table, row),
      }),
    ),
    total: total.rows[0].count,
    page: input.page,
    pageSize: input.pageSize,
  };
}
