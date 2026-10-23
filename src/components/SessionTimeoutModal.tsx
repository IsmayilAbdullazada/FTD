import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionTimeoutModalProps {
  isAuthenticated: boolean;
  onTimeout: () => void;
  // Inactivity timeout in milliseconds (default 15 minutes = 900,000 ms)
  timeoutMs?: number;
  // Warning duration before logout in seconds (default 60 seconds)
  warningSeconds?: number;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isAuthenticated,
  onTimeout,
  timeoutMs = 15 * 60 * 1000, // 15 minutes standard clinical inactivity timeout
  warningSeconds = 60, // 60 seconds warning countdown
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningSeconds);

  const lastActivityRef = useRef<number>(Date.now());
  const timerCheckIntervalRef = useRef<any>(null);
  const warningCountdownIntervalRef = useRef<any>(null);

  // Reset activity timestamp
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // If warning was active, hide it and reset
    if (showWarning) {
      setShowWarning(false);
      setRemainingSeconds(warningSeconds);
    }
  }, [showWarning, warningSeconds]);

  // Keep session alive when user explicitly clicks "Stay Signed In"
  const handleStaySignedIn = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setRemainingSeconds(warningSeconds);
  };

  // Sign out immediately
  const handleSignOutNow = () => {
    setShowWarning(false);
    onTimeout();
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      if (timerCheckIntervalRef.current) clearInterval(timerCheckIntervalRef.current);
      if (warningCountdownIntervalRef.current) clearInterval(warningCountdownIntervalRef.current);
      return;
    }

    lastActivityRef.current = Date.now();

    // Listen to user interactions (throttled)
    let lastEventTime = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttle event handling to at most once every 2 seconds
      if (now - lastEventTime > 2000) {
        lastEventTime = now;
        if (!showWarning) {
          lastActivityRef.current = now;
        }
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    // Check inactivity periodically (every 5 seconds)
    timerCheckIntervalRef.current = setInterval(() => {
      const inactiveMs = Date.now() - lastActivityRef.current;
      const warningThresholdMs = timeoutMs - warningSeconds * 1000;

      if (inactiveMs >= timeoutMs) {
        // Complete timeout
        clearInterval(timerCheckIntervalRef.current);
        setShowWarning(false);
        onTimeout();
      } else if (inactiveMs >= warningThresholdMs && !showWarning) {
        // Trigger countdown warning
        const secondsLeft = Math.max(1, Math.ceil((timeoutMs - inactiveMs) / 1000));
        setRemainingSeconds(secondsLeft);
        setShowWarning(true);
      }
    }, 3000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      if (timerCheckIntervalRef.current) clearInterval(timerCheckIntervalRef.current);
      if (warningCountdownIntervalRef.current) clearInterval(warningCountdownIntervalRef.current);
    };
  }, [isAuthenticated, timeoutMs, warningSeconds, onTimeout, showWarning]);

  // Handle countdown interval when warning modal is open
  useEffect(() => {
    if (showWarning) {
      warningCountdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(warningCountdownIntervalRef.current);
            setShowWarning(false);
            onTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (warningCountdownIntervalRef.current) {
        clearInterval(warningCountdownIntervalRef.current);
      }
    }

    return () => {
      if (warningCountdownIntervalRef.current) {
        clearInterval(warningCountdownIntervalRef.current);
      }
    };
  }, [showWarning, onTimeout]);

  if (!showWarning || !isAuthenticated) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
        {/* Animated Warning Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>

        <div>
          <h3 id="session-timeout-title" className="text-base font-bold text-slate-900 dark:text-white">
            Session Expiring Soon
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            For your security and privacy, your session will automatically time out due to inactivity.
          </p>
        </div>

        {/* Live Countdown Badge */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Time Remaining
          </div>
          <div className="text-3xl font-extrabold text-[#002D72] dark:text-blue-400 tabular-nums mt-0.5">
            {remainingSeconds}s
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleStaySignedIn}
            className="w-full py-2.5 px-4 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Stay Signed In</span>
          </button>

          <button
            type="button"
            onClick={handleSignOutNow}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
