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
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(
    null,
  );

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(
    null,
  );
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
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const resetTokenParam =
      fragment.get('resetToken') ?? params.get('resetToken');
    const resetEmailParam = params.get('email');
    if (!resetTokenParam) return;
    setMode('forgot-password');
    setForgotStep('reset');
    setForgotEmail(resetEmailParam || '');
    setResetToken(resetTokenParam);
    setResetSuccessMessage('Choose a new password for your account.');
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('resetToken');
    cleanUrl.searchParams.delete('email');
    fragment.delete('resetToken');
    cleanUrl.hash = fragment.toString();
    window.history.replaceState(window.history.state, '', cleanUrl.toString());
  }, []);

  const loadInvitation = async (token: string) => {
    setLoadingInvite(true);
    setRegisterError(null);
    try {
      const res = await authApi.getInvitation(token);
      setInviteData(res.invitation);
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
    setLoginSuccessMessage(null);
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

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setIsSendingReset(true);
    setResetError(null);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setResetToken(null);
      setResetSuccessMessage(
        'If the account exists, open the password reset link sent by email.',
      );
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
    if (!resetToken) {
      setResetError('Reset link is missing. Request a new link.');
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
      await authApi.resetPassword({
        token: resetToken,
        newPassword,
      });

      setMode('login');
      setLoginIdentifier(forgotEmail.trim());
      setLoginPassword('');
      setLoginError(null);
      setLoginSuccessMessage(
        'Your password has been reset. Sign in with your new password.',
      );
      setNewPassword('');
      setConfirmPassword('');
      setResetToken(null);
      setForgotStep('request');
      setResetSuccessMessage(null);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.set('tab', 'login');
      cleanUrl.searchParams.delete('resetToken');
      cleanUrl.searchParams.delete('email');
      window.history.replaceState(
        window.history.state,
        '',
        cleanUrl.toString(),
      );
    } catch (err: unknown) {
      reportError('Reset confirmation failed:', err);
      setResetError(
        (err instanceof Error ? err.message : undefined) ||
          'Reset link is invalid or expired. Request a new link.',
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
    loginSuccessMessage,
    forgotEmail,
    setForgotEmail,
    forgotStep,
    setForgotStep,
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
