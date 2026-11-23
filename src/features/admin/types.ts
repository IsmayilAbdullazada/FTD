export interface AdminColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  readOnly: boolean;
  sensitive: boolean;
  enumValues?: string[];
}
export interface AdminForeignKey {
  columns: string[];
  targetTable: string;
  targetColumns: string[];
  onDelete: string;
}
export interface AdminTable {
  name: string;
  readOnly: boolean;
  columns: AdminColumn[];
  primaryKey: string[];
  foreignKeys: AdminForeignKey[];
}
export interface AdminActionField {
  name: string;
  label: string;
  type: 'text' | 'longtext' | 'number' | 'boolean' | 'date' | 'select' | 'json';
  required?: boolean;
  options?: string[];
}
export interface AdminAction {
  id: string;
  label: string;
  table: string;
  destructive: boolean;
  fields: AdminActionField[];
}
export type AdminRow = Record<string, unknown> & {
  _key?: Record<string, unknown>;
};
export interface AdminPage {
  items: AdminRow[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AdminIntent {
  operation:
    | {
        kind: 'data';
        table: string;
        mode: 'create' | 'update' | 'delete';
        keys: Record<string, unknown>[];
        values: Record<string, unknown>;
      }
    | { kind: 'action'; action: string; args: Record<string, unknown> };
  reason: string;
}
export interface MutationPreview {
  table: string;
  destructive: boolean;
  requiresPassword: boolean;
  rowsAffected: number;
  before: unknown;
  after: unknown;
  relationships: { table: string; onDelete: string; count: number }[];
  previewToken: string;
}
export interface PreviewTarget {
  id: string;
  name: string;
  role: string;
}
