import { requestJson, apiFetch } from '@/shared/api/httpClient';
import type {
  AdminTable,
  AdminAction,
  AdminPage,
  AdminIntent,
  MutationPreview,
  AdminRow,
  PreviewTarget,
} from '../types';
const base = '/api/v1/admin';
const post = <T>(path: string, body: unknown) =>
  requestJson<T>(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
export const adminApi = {
  registry: () =>
    requestJson<{ tables: AdminTable[]; actions: AdminAction[] }>(
      base + '/registry',
    ),
  overview: () =>
    requestJson<Record<string, unknown>>(base + '/database-status'),
  rows: (table: string, params: URLSearchParams) =>
    requestJson<AdminPage>(
      `${base}/data/${encodeURIComponent(table)}?${params}`,
    ),
  row: (table: string, key: Record<string, unknown>) =>
    requestJson<AdminRow>(
      `${base}/data/${encodeURIComponent(table)}/row?key=${encodeURIComponent(JSON.stringify(key))}`,
    ),
  choices: (table: string, column: string, search: string) =>
    requestJson<{ choices: { value: unknown; label: string }[] }>(
      `${base}/data/${encodeURIComponent(table)}/choices?${new URLSearchParams({ column, search })}`,
    ),
  reveal: (table: string, key: Record<string, unknown>, reason: string) =>
    post<AdminRow>(`/data/${encodeURIComponent(table)}/reveal`, {
      key,
      reason,
    }),
  preview: (intent: AdminIntent) =>
    post<MutationPreview>('/mutations/preview', intent),
  commit: (intent: AdminIntent, previewToken: string, confirmation: string) =>
    post<{ success: boolean; auditId: string }>('/mutations/commit', {
      intent,
      previewToken,
      confirmation,
    }),
  reauthenticate: (password: string) =>
    post<{ success: boolean; validForSeconds: number }>('/reauthenticate', {
      password,
    }),
  audit: (page: number) =>
    requestJson<AdminPage>(
      base + '/audit?' + new URLSearchParams({ page: String(page) }),
    ),
  diagnostics: () =>
    requestJson<{
      guides: {
        id: string;
        title: string;
        status: string;
        is_active: boolean;
        total_chunks: number;
        word_count: number;
      }[];
      orphanUploads: Record<string, unknown>[];
      indexes: Record<string, unknown>[];
    }>(base + '/diagnostics'),
  previewUsers: (role: string, search: string) =>
    requestJson<{
      users: {
        id: string;
        first_name: string;
        last_name: string;
        anonymous_handle: string;
        email: string;
        role: string;
      }[];
    }>(base + '/preview-users?' + new URLSearchParams({ role, search })),
  startPreview: (targetUserId: string, reason: string) =>
    post<{ token: string; target: PreviewTarget; expiresInSeconds: number }>(
      '/preview',
      { targetUserId, reason },
    ),
  exportPage: async (table: string, params: URLSearchParams) => {
    const response = await apiFetch(
      `${base}/data/${encodeURIComponent(table)}/export?${params}`,
    );
    if (!response.ok) throw new Error('CSV export failed');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = table + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  },
};
