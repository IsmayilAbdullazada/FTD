import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserCheck,
  Stethoscope,
  Users,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { CurrentUser, Condition } from '../types';
import { api } from '../services/api';

interface AuthScreensProps {
  onLoginSuccess: (user: CurrentUser, token?: string) => void;
  initialMode?: 'login' | 'forgot-password' | 'register';
  initialToken?: string;
  onCancel?: () => void;
}

export const AuthScreens: React.FC<AuthScreensProps> = ({
  onLoginSuccess,
  initialMode = 'login',
  initialToken,
  onCancel,
}) => {
  const [mode, setMode] = useState<'login' | 'forgot-password' | 'register'>(initialMode);
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
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
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
  const [registerHandle, setRegisterHandle] = useState(() => `CarePartner-${Math.floor(1000 + Math.random() * 9000)}`);
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

  const loadInvitation = async (token: string) => {
    setLoadingInvite(true);
    setRegisterError(null);
    try {
      const res = await api.getInvitation(token);
      setInviteData(res.invitation);
      // Auto-assign random anonymous handle
      setRegisterHandle((prev) => prev || `CarePartner-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      console.error('Failed to load invitation:', err);
      setRegisterError(err.message || 'Invitation not found or expired.');
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
      const res = await api.login({
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });

      if (rememberMe) {
        localStorage.setItem('jh_user_id', res.user.id);
        if (res.token) localStorage.setItem('jh_session_token', res.token);
      }
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err.message || 'Invalid credentials. Please verify your email/ID and password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 1-Click Quick Demo Login for instant review
  const handleQuickDemoLogin = (userId: string) => {
    if (userId === 'user-clinician-1') {
      setLoginIdentifier('sgulyan1@jhmi.edu');
      setLoginPassword('Hopkins2026!');
    } else if (userId === 'user-care-1') {
      setLoginIdentifier('sarah.smith@example.com');
      setLoginPassword('Hopkins2026!');
    } else if (userId === 'user-care-2') {
      setLoginIdentifier('marcus.vance@example.com');
      setLoginPassword('Hopkins2026!');
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
      const res = await api.forgotPassword(forgotEmail.trim());
      setResetToken(res.resetToken || null);
      if (res.testCode) {
        setResetCode(res.testCode);
      }
      if (res.previewUrl) {
        setEmailPreviewUrl(res.previewUrl);
      }
      setResetSuccessMessage(`A 6-digit verification code has been dispatched to ${forgotEmail.trim()}.`);
      setForgotStep('verify');
    } catch (err: any) {
      console.error('Password reset request failed:', err);
      setResetError(err.message || 'Could not send recovery email. Please check the address.');
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
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSendingReset(true);
    setResetError(null);
    try {
      const res = await api.resetPassword({
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
    } catch (err: any) {
      console.error('Reset confirmation failed:', err);
      setResetError(err.message || 'Invalid or expired code. Please try again.');
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
    if (!registerPassword || registerPassword.length < 6) {
      setRegisterError('Please choose a password with at least 6 characters.');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    try {
      const res = await api.registerWithInvite({
        token: inviteToken.trim(),
        password: registerPassword,
        anonymousHandle: registerHandle.trim() || undefined,
        firstName: inviteData?.firstName,
        lastName: inviteData?.lastName,
      });

      localStorage.setItem('jh_user_id', res.user.id);
      if (res.token) localStorage.setItem('jh_session_token', res.token);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setRegisterError(err.message || 'Could not complete registration. Token may be invalid.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 transition-colors selection:bg-[#002D72]/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Johns Hopkins Medicine Official Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 sm:w-18 sm:h-18 bg-white dark:bg-slate-900 rounded-2xl p-2.5 shadow-md border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-3 group transition-transform hover:scale-105">
            <img
              src="/website_logo.png"
              alt="Johns Hopkins Medicine"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#002D72] dark:text-blue-400">
            JOHNS HOPKINS MEDICINE
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 dark:text-white mt-1">
            Care Partner Connect
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Memory and Alzheimer's Treatment Center
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-6 px-4 shadow-xl border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-8 transition-colors">
          
          {/* ========================================================= */}
          {/* SCREEN 1: LOGIN */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Sign in to your account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Access your clinical peer cohort, knowledge guides, and verified clinic updates.
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{loginError}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email or Clinic Patient ID
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. sgulyan1@jhmi.edu or sarah.smith@example.com"
                      className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot-password');
                        setForgotEmail(loginIdentifier);
                        setResetError(null);
                        setResetSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter account password (or default Hopkins2026!)"
                      className="block w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#002D72] focus:ring-[#002D72]"
                    />
                    <span className="ml-2">Remember on this workstation</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 focus:outline-none transition cursor-pointer disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* 1-Click Persona Access Buttons for Fast Verification */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 text-center">
                  1-Click Test Access:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('user-clinician-1')}
                    className="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-[11px] transition cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>Dr. Seema</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Moderator</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('user-care-1')}
                    className="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-[11px] transition cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      <span>Sarah S.</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">FTD Partner</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('user-care-2')}
                    className="p-2 text-left rounded-lg border border-slate-200 dark:border-slate-750 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-[11px] transition cursor-pointer"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Marcus V.</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">FTD Partner</div>
                  </button>
                </div>
              </div>

              {/* Invitation Acceptance Notice */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setRegisterError(null);
                  }}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-[#002D72] dark:hover:text-blue-400 transition cursor-pointer font-medium"
                >
                  Have an invitation token? <span className="font-bold underline">Register here</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: FORGOT PASSWORD */}
          {/* ========================================================= */}
          {mode === 'forgot-password' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setResetError(null);
                    setResetSuccessMessage(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#002D72] dark:text-blue-400" />
                  <span>Reset account password</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {forgotStep === 'request'
                    ? 'Enter the email address registered with Johns Hopkins Medicine.'
                    : `Enter the 6-digit recovery code sent to ${forgotEmail}.`}
                </p>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{resetError}</div>
                </div>
              )}

              {resetSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div className="flex-1">
                    <div>{resetSuccessMessage}</div>
                    {emailPreviewUrl && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                        <a
                          href={emailPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 underline"
                        >
                          <span>Open sent recovery email preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {forgotStep === 'request' ? (
                <form onSubmit={handleRequestPasswordReset} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Account Email Address
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. sarah.smith@example.com"
                        className="block w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 focus:outline-none transition cursor-pointer disabled:opacity-60"
                  >
                    {isSendingReset ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending recovery code...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Recovery Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordReset} className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setForgotStep('request')}
                        className="text-[11px] text-[#002D72] dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Resend code
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 481920"
                      className="block w-full px-3 py-2 text-center tracking-widest font-mono text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition cursor-pointer disabled:opacity-60"
                  >
                    {isSendingReset ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Password & Sign In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: ACCEPT INVITATION & REGISTER */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setRegisterError(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Claim Clinical Invitation</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verified invitation required by Johns Hopkins Medicine to ensure caregiver privacy.
                </p>
              </div>

              {registerError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">{registerError}</div>
                </div>
              )}

              {!inviteData && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Invitation Security Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value.trim())}
                      placeholder="Enter invitation link or token"
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D72]"
                    />
                    <button
                      type="button"
                      onClick={() => loadInvitation(inviteToken)}
                      disabled={loadingInvite || !inviteToken}
                      className="px-3.5 py-2 bg-[#002D72] text-white rounded-xl text-xs font-bold hover:bg-blue-900 cursor-pointer disabled:opacity-60 transition"
                    >
                      {loadingInvite ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                </div>
              )}

              {inviteData && (
                <form onSubmit={handleCompleteRegistration} className="space-y-3.5">
                  {/* Automatically assigned random anonymous handle */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Anonymous Community Handle
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>{registerHandle}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                      Auto-assigned
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="block w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D72]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition cursor-pointer disabled:opacity-60"
                  >
                    {isRegistering ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Join Community</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Clinical Disclaimer & Emergency Line */}
        <div className="mt-4 text-center text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <p>
            Johns Hopkins Medicine • Memory and Alzheimer's Treatment Center
          </p>
          <p>
            Clinical Inquiries: (410) 955-5147 • In a life-threatening crisis, dial <strong>911</strong> immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
