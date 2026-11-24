import { Button } from '@/shared/components/Button';
import { GuidelinesAcknowledgment } from '@/features/policies/components/GuidelinesAcknowledgment';
import { CarePartnerDetailsFields } from './CarePartnerDetailsFields';
import { parseCarePartnerDetails } from '../lib/carePartnerDetails';
import { useAuthState } from '../hooks/AuthStateContext';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
} from 'lucide-react';

export function RecoveryPanel() {
  const {
    recovery,
    setRecovery,
    mode,
    setMode,
    forgotEmail,
    setForgotEmail,
    forgotStep,
    setForgotStep,
    setResetToken,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isSendingReset,
    resetError,
    setResetError,
    resetSuccessMessage,
    setResetSuccessMessage,
    handleRequestPasswordReset,
    handleConfirmPasswordReset,
  } = useAuthState();

  return (
    <>
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
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#002D72] dark:text-blue-400" />
              <span>Reset your password</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {forgotStep === 'request'
                ? "Enter your email and we'll send a password reset link."
                : 'Choose a new password using your secure reset link.'}
            </p>
          </div>

          {resetError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{resetError}</div>
            </div>
          )}

          {resetSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <div>{resetSuccessMessage}</div>
              </div>
            </div>
          )}

          {forgotStep === 'request' ? (
            <form onSubmit={handleRequestPasswordReset} className="space-y-4">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email address
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="block w-full pl-10 pr-3.5 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isSendingReset}
              >
                {isSendingReset ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Send reset link</span>
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setForgotStep('request');
                  setResetToken(null);
                  setResetError(null);
                  setResetSuccessMessage(null);
                }}
                className="text-sm font-medium text-[#002D72] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Request a new link
              </button>

              {recovery.stage === 'checking' && (
                <p
                  role="status"
                  className="text-sm text-slate-600 dark:text-slate-300"
                >
                  Checking your reset link…
                </p>
              )}
              {recovery.stage === 'details' && (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!parseCarePartnerDetails(recovery.details)) {
                      setResetError(
                        'Complete all five fields with valid details.',
                      );
                      return;
                    }
                    setResetError(null);
                    setRecovery({ ...recovery, stage: 'password' });
                  }}
                >
                  <CarePartnerDetailsFields
                    value={recovery.details}
                    onChange={(details) =>
                      setRecovery({ ...recovery, details })
                    }
                  />
                  <Button type="submit" variant="primary" className="w-full">
                    Continue to password
                  </Button>
                </form>
              )}
              {recovery.stage === 'password' && (
                <form
                  onSubmit={handleConfirmPasswordReset}
                  className="space-y-4"
                >
                  {recovery.requiresProfile && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setRecovery({ ...recovery, stage: 'details' })
                      }
                    >
                      Edit details
                    </Button>
                  )}
                  <div>
                    <label
                      htmlFor="reset-new-password"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      New password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      id="reset-new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="block w-full px-3.5 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reset-confirm-password"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      required
                      id="reset-confirm-password"
                      autoComplete="new-password"
                      maxLength={128}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="block w-full px-3.5 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                    />
                  </div>

                  <GuidelinesAcknowledgment
                    checked={recovery.acceptedGuidelines}
                    onChange={(acceptedGuidelines) =>
                      setRecovery({ ...recovery, acceptedGuidelines })
                    }
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Reset password</span>
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
