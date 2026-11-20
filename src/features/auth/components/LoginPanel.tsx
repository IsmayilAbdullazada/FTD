import { useAuthState } from '../hooks/AuthStateContext';
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from 'lucide-react';

export function LoginPanel() {
  const {
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
    loginError,
    loginSuccessMessage,
    setForgotEmail,
    setResetError,
    setResetSuccessMessage,
    setRegisterError,
    handleLogin,
    sessionNotice,
  } = useAuthState();

  return (
    <>
      {mode === 'login' && (
        <div className="space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Enter your email and password to access Care Partner Connect.
            </p>
          </div>

          {sessionNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-sm flex items-start gap-2.5 shadow-2xs animate-in fade-in">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <div className="font-semibold text-amber-900 dark:text-amber-100">
                  Session Expired
                </div>
                <div className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                  {sessionNotice}
                </div>
              </div>
            </div>
          )}

          {loginSuccessMessage && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-sm flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{loginSuccessMessage}</div>
            </div>
          )}

          {loginError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{loginError}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email or Patient ID
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
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
                  className="text-sm font-semibold text-[#002D72] dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-11 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#002D72] focus:ring-[#002D72]"
                />
                <span className="ml-2">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 focus:outline-none transition cursor-pointer disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Invitation Acceptance Notice */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setRegisterError(null);
              }}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-[#002D72] dark:hover:text-blue-400 transition cursor-pointer font-medium"
            >
              Have an invite link?{' '}
              <span className="font-bold underline">Join here</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
