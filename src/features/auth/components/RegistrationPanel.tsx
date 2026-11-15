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
    registerHandle,
    setRegisterHandle,
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
              className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Join Care Partner Connect</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Welcome! Set up your password below to create your account and
              join the community.
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
                Invite code or link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value.trim())}
                  placeholder="Paste your invite code or link"
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#002D72]"
                />
                <button
                  type="button"
                  onClick={() => loadInvitation(inviteToken)}
                  disabled={loadingInvite || !inviteToken}
                  className="px-3.5 py-2 bg-[#002D72] text-white rounded-xl text-xs font-bold hover:bg-blue-900 cursor-pointer disabled:opacity-60 transition"
                >
                  {loadingInvite ? 'Checking...' : 'Continue'}
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
                    Anonymous username
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <input
                      aria-label="Community handle"
                      value={registerHandle}
                      onChange={(event) =>
                        setRegisterHandle(event.target.value)
                      }
                      maxLength={40}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                  Auto-assigned
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
