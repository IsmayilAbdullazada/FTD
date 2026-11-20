import { requestJson } from '@/shared/api/httpClient';

export interface GuidelinesStatus {
  policyType: string;
  currentVersion: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export const policiesApi = {
  getStatus(): Promise<GuidelinesStatus> {
    return requestJson<GuidelinesStatus>(
      '/api/v1/policies/status',
      undefined,
      'Unable to load Community Guidelines status.',
    );
  },

  acknowledge(): Promise<GuidelinesStatus> {
    return requestJson<GuidelinesStatus>(
      '/api/v1/policies/acknowledge',
      {
        method: 'POST',
      },
      'Unable to save Community Guidelines acknowledgment.',
    );
  },
};