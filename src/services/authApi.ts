import { Condition, CurrentUser } from '../types';
import { apiFetch, requestJson } from './httpClient';

interface AuthResponse {
  success: boolean;
  user: CurrentUser;
}

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  emailSent?: boolean;
  previewUrl?: string;
  resetToken?: string;
  testCode?: string;
  requiresEmailLink?: boolean;
}

interface InvitationResponse {
  valid: boolean;
  invitation: {
    email: string;
    firstName: string;
    lastName: string;
    condition: Condition;
    primaryCohortSlug: string;
  };
}

export const authApi = {
  login(payload: {
    identifier: string;
    password?: string;
    rememberMe?: boolean;
  }): Promise<AuthResponse> {
    return requestJson<AuthResponse>(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Failed to authenticate.',
    );
  },

  async logout(): Promise<void> {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
  },

  forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return requestJson<ForgotPasswordResponse>(
      '/api/v1/auth/forgot-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      },
      'Failed to request password reset.',
    );
  },

  resetPassword(payload: {
    email?: string;
    code?: string;
    token?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return requestJson(
      '/api/v1/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Failed to update password.',
    );
  },

  getInvitation(token: string): Promise<InvitationResponse> {
    return requestJson(
      `/api/v1/auth/invitations/${encodeURIComponent(token)}`,
      undefined,
      'Invitation not found or expired.',
    );
  },

  registerWithInvite(payload: {
    token: string;
    password?: string;
    anonymousHandle?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  }): Promise<AuthResponse> {
    return requestJson<AuthResponse>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Registration failed.',
    );
  },
};
