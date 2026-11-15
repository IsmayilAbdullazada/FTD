import { authApi } from '@/features/auth/api/authApi';
import { reportError } from '@/shared/lib/logger';
import { Condition, CurrentUser } from '@/types';
import React, { useEffect, useState } from 'react';

export interface AuthScreensProps {
  onLoginSuccess: (user: CurrentUser) => void;
  initialMode?: 'login' | 'forgot-password' | 'register';
  initialToken?: string;
  onCancel?: () => void;
  sessionNotice?: string | null;
}

export function useAuthScreens({
  onLoginSuccess,
  initialMode = 'login',
  initialToken,
  onCancel,
  sessionNotice,
}: AuthScreensProps) {
  const [mode, setMode] = useState<'login' | 'forgot-password' | 'register'>(
    initialMode,
  );
  const [showPassword, setShowPassword] = useState(false);

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(
    null,
  );
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Invite / Register State
  const [inviteToken, setInviteToken] = useState(initialToken || '');
  const [inviteData, setInviteData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    condition: Condition;
    primaryCohortSlug: string;
  } | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerHandle, setRegisterHandle] = useState(
    () => `User-${Math.floor(1000 + Math.random() * 9000)}`,
  );
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // If initialToken was provided, switch to register mode and load invitation
  useEffect(() => {
    if (initialToken) {
      setMode('register');
      setInviteToken(initialToken);
      loadInvitation(initialToken);
    }
  }, [initialToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetTokenParam = params.get('resetToken');
    const resetEmailParam = params.get('email');
    if (!resetTokenParam || !resetEmailParam) return;
    setMode('forgot-password');
    setForgotStep('verify');
    setForgotEmail(resetEmailParam);
    setResetToken(resetTokenParam);
    setResetSuccessMessage(
      'Enter the 6-digit verification code from your email.',
    );
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('resetToken');
    cleanUrl.searchParams.delete('email');
    window.history.replaceState(window.history.state, '', cleanUrl.toString());
  }, []);

  const loadInvitation = async (token: string) => {
    setLoadingInvite(true);
    setRegisterError(null);
    try {
      const res = await authApi.getInvitation(token);
      setInviteData(res.invitation);
      // Auto-assign random anonymous handle
      setRegisterHandle(
        (prev) => prev || `User-${Math.floor(1000 + Math.random() * 9000)}`,
      );
    } catch (err: unknown) {
      reportError('Failed to load invitation:', err);
      setRegisterError(
        (err instanceof Error ? err.message : undefined) ||
          'Invitation not found or expired.',
      );
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim()) {
      setLoginError('Please enter your email or Clinic Patient ID.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await authApi.login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
        rememberMe,
      });
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      reportError('Login error:', err);
      setLoginError(
        (err instanceof Error ? err.message : undefined) ||
          'Invalid credentials. Please verify your email/ID and password.',
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 1-Click Quick Demo Login for instant review

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setIsSendingReset(true);
    setResetError(null);
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setResetToken(res.resetToken || null);
      if (res.testCode) {
        setResetCode(res.testCode);
      }
      if (res.previewUrl) {
        setEmailPreviewUrl(res.previewUrl);
      }
      if (res.resetToken) {
        setResetSuccessMessage(
          `A 6-digit verification code has been dispatched to ${forgotEmail.trim()}.`,
        );
        setForgotStep('verify');
      } else {
        setResetSuccessMessage(
          'If the account exists, open the password reset link sent by email.',
        );
      }
    } catch (err: unknown) {
      reportError('Password reset request failed:', err);
      setResetError(
        (err instanceof Error ? err.message : undefined) ||
          'Could not send recovery email. Please check the address.',
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
      setResetError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSendingReset(true);
    setResetError(null);
    try {
      const res = await authApi.resetPassword({
        email: forgotEmail.trim(),
        code: resetCode.trim(),
        token: resetToken || undefined,
        newPassword,
      });

      setResetSuccessMessage(res.message || 'Password successfully updated.');
      setTimeout(() => {
        setMode('login');
        setLoginIdentifier(forgotEmail.trim());
        setLoginPassword(newPassword);
        setForgotStep('request');
        setResetSuccessMessage(null);
      }, 1500);
    } catch (err: unknown) {
      reportError('Reset confirmation failed:', err);
      setResetError(
        (err instanceof Error ? err.message : undefined) ||
          'Invalid or expired code. Please try again.',
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      setRegisterError('Invitation token is required.');
      return;
    }
    if (!registerPassword || registerPassword.length < 8) {
      setRegisterError('Please choose a password with at least 8 characters.');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    try {
      const res = await authApi.registerWithInvite({
        token: inviteToken.trim(),
        password: registerPassword,
        anonymousHandle: registerHandle.trim() || undefined,
        firstName: inviteData?.firstName,
        lastName: inviteData?.lastName,
      });

      setInviteData(null);
      setInviteToken('');
      setRegisterError(null);
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      reportError('Registration failed:', err);
      setRegisterError(
        (err instanceof Error ? err.message : undefined) ||
          'Could not complete registration. Token may be invalid.',
      );
    } finally {
      setIsRegistering(false);
    }
  };

  return {
    mode,
    setMode,
    showPassword,
    setShowPassword,
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    rememberMe,
    setRememberMe,
    isLoggingIn,
    setIsLoggingIn,
    loginError,
    setLoginError,
    forgotEmail,
    setForgotEmail,
    forgotStep,
    setForgotStep,
    resetCode,
    setResetCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isSendingReset,
    setIsSendingReset,
    resetError,
    setResetError,
    resetSuccessMessage,
    setResetSuccessMessage,
    emailPreviewUrl,
    setEmailPreviewUrl,
    resetToken,
    setResetToken,
    inviteToken,
    setInviteToken,
    inviteData,
    setInviteData,
    loadingInvite,
    setLoadingInvite,
    registerPassword,
    setRegisterPassword,
    registerHandle,
    setRegisterHandle,
    registerError,
    setRegisterError,
    isRegistering,
    setIsRegistering,
    loadInvitation,
    handleLogin,
    handleRequestPasswordReset,
    handleConfirmPasswordReset,
    handleCompleteRegistration,
  };
}
