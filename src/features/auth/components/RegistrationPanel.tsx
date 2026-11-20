import { useAuthState } from '../hooks/AuthStateContext';
import { AlertCircle, ArrowLeft, ShieldCheck, UserCheck } from 'lucide-react';

export function RegistrationPanel() {
  const {
    mode,
    setMode,
    inviteToken,
    setInviteToken,
    inviteData,
    loadingInvite,
    registerPassword,
    setRegisterPassword,
    registerError,
    setRegisterError,
    isRegistering,
    loadInvitation,
    handleCompleteRegistration,
  } = useAuthState();

  return (
    <>
      {mode === 'register' && (
        <div className="space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setRegisterError(null);
              }}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Join Care Partner Connect</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Welcome! Set up your password below to create your account and
              join the community.
            </p>
          </div>

          {registerError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">{registerError}</div>
            </div>
          )}

          {!inviteData && (
            <div className="space-y-2">
              <label
                htmlFor="invite-code-input"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Invite code or link
              </label>
              <div className="flex gap-2">
                <input
                  id="invite-code-input"
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value.trim())}
                  placeholder="Paste your invite code or link"
                  className={`flex-1 min-w-0 px-3.5 py-2.5 text-base ${inviteToken ? 'font-mono' : 'font-sans'} placeholder:font-sans placeholder-slate-400 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500`}
                />
                <button
                  type="button"
                  onClick={() => loadInvitation(inviteToken)}
                  disabled={loadingInvite || !inviteToken}
                  className="px-4 py-2.5 bg-[#002D72] text-white rounded-xl text-sm font-bold hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer disabled:opacity-60 transition shrink-0"
                >
                  {loadingInvite ? 'Checking...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {inviteData && (
            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              {/* The database assigns a unique, neutral public tag during registration */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Your anonymous user tag
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                    <span>You will receive a tag such as User-123</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600 shrink-0">
                  Auto-assigned
                </span>
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={8}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="block w-full px-3.5 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002D72] dark:focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition cursor-pointer disabled:opacity-60"
              >
                {isRegistering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Joining community...</span>
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
    </>
  );
}
