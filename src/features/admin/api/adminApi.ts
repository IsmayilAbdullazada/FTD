import { apiFetch, safeFetchJson } from '@/shared/api/httpClient';

interface DatabaseCounts {
  users: number;
  carePartners: number;
  staff: number;
  posts: number;
  pendingQueue: number;
  comments: number;
  auditEvents: number;
  invitations: number;
  guides: number;
}

interface DatabaseStatus {
  isCleanLaunch: boolean;
  counts: DatabaseCounts;
  securityStatus: {
    port: number;
    environment: string;
    databaseTlsConfigured: boolean;
    developmentAuthPreviewsEnabled: boolean;
    databaseResetEnabled: boolean;
    allowedOrigins: string[];
  };
}

interface ResetDatabaseResponse {
  success: boolean;
  mode: string;
  message: string;
  counts: DatabaseCounts;
}

export const adminApi = {
  getDatabaseStatus(): Promise<DatabaseStatus> {
    return safeFetchJson('/api/v1/admin/database-status', undefined);
  },

  async resetDatabase(mode: 'clean' | 'demo'): Promise<ResetDatabaseResponse> {
    const response = await apiFetch('/api/v1/admin/reset-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to update database mode');
    }
    return response.json();
  },
};
