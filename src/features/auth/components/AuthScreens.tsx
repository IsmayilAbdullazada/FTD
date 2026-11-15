import { AuthStateContext } from '../hooks/AuthStateContext';
import React from 'react';
import { LoginPanel } from './LoginPanel';
import { RecoveryPanel } from './RecoveryPanel';
import { RegistrationPanel } from './RegistrationPanel';

import { useAuthScreens, type AuthScreensProps } from '../hooks/useAuthScreens';
export const AuthScreens: React.FC<AuthScreensProps> = ({
  onLoginSuccess,
  initialMode = 'login',
  initialToken,
  onCancel,
  sessionNotice,
}) => {
  const model = useAuthScreens({
    onLoginSuccess,
    initialMode,
    initialToken,
    onCancel,
    sessionNotice,
  });

  return (
    <AuthStateContext.Provider value={{ ...model, sessionNotice }}>
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
            <LoginPanel />
            {/* ========================================================= */}
            {/* SCREEN 2: FORGOT PASSWORD */}
            {/* ========================================================= */}
            <RecoveryPanel />
            {/* ========================================================= */}
            {/* SCREEN 3: ACCEPT INVITATION & REGISTER */}
            {/* ========================================================= */}
            <RegistrationPanel />
          </div>

          {onCancel && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium cursor-pointer"
              >
                ← Return to platform
              </button>
            </div>
          )}

          {/* Clinical Disclaimer & Emergency Line */}
          <div className="mt-4 text-center text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              Johns Hopkins Medicine • Memory and Alzheimer's Treatment Center
            </p>
            <p>
              Clinical Inquiries: (410) 955-5147 • In a life-threatening crisis,
              dial <strong>911</strong> immediately.
            </p>
          </div>
        </div>
      </div>
    </AuthStateContext.Provider>
  );
};
