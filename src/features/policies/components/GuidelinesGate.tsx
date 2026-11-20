import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { policiesApi, type GuidelinesStatus } from '../api/policiesApi';
import { CommunityGuidelines } from './CommunityGuidelines';
import { GuidelinesAcknowledgment } from './GuidelinesAcknowledgment';
import { CommunityGuidelinesModal } from './CommunityGuidelinesModal';

interface GuidelinesGateProps {
  onContinue: () => void;
  onSignOut: () => void;
}

export function GuidelinesGate({ onContinue, onSignOut }: GuidelinesGateProps) {
  const [status, setStatus] = useState<GuidelinesStatus | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const result = await policiesApi.getStatus();

        if (!cancelled) {
          setStatus(result);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load Community Guidelines status.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleContinue() {
    if (!status || saving) return;

    if (status.acknowledged) {
      onContinue();
      return;
    }

    if (!checked) return;

    setSaving(true);
    setError(null);

    try {
      const result = await policiesApi.acknowledge();

      if (!result.acknowledged) {
        throw new Error('Acknowledgment was not saved.');
      }

      onContinue();
    } catch {
      setError('Unable to save your acknowledgment. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-3 text-center">
          <img
            src="/website_logo.png"
            alt="Hopkins Care Partner Connect"
            className="mx-auto h-20 w-20 object-contain"
          />

          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#002D72] dark:text-blue-300">
            Johns Hopkins Medicine
          </p>

          <h1 className="font-serif text-3xl font-bold text-slate-900 dark:text-white">
            Community Guidelines
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Please review our community expectations before continuing to Care
            Partner Connect.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-[#002D72] dark:text-blue-300" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  A Safe and Supportive Community
                </p>
                <h2 className="font-serif text-xl font-bold text-slate-900 dark:text-white">
                  Welcome to Care Partner Connect
                </h2>
              </div>
            </div>
          </div>

          <div className="max-h-[45vh] overflow-y-auto px-6 py-5">
            <CommunityGuidelines variant="embedded" />
          </div>

          <div className="space-y-4 border-t border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/60">
            {loading && (
              <p
                role="status"
                className="text-sm text-slate-600 dark:text-slate-300"
              >
                Checking your acknowledgment status...
              </p>
            )}

            {!loading && status && !status.acknowledged && (
              <GuidelinesAcknowledgment
                checked={checked}
                onChange={setChecked}
                onViewGuidelines={() => setShowDetails(true)}
              />
            )}

            {!loading && status?.acknowledged && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                You've already acknowledged these guidelines. Please review them
                before continuing.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleContinue()}
              disabled={
                loading ||
                saving ||
                !status ||
                (!status.acknowledged && !checked)
              }
              className="w-full rounded-xl bg-[#002D72] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#001D4A] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? 'Saving acknowledgment...'
                : status?.acknowledged
                  ? 'Continue to Dashboard'
                  : 'Agree and Continue'}
            </button>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full text-center text-sm font-medium text-slate-500 hover:underline dark:text-slate-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {showDetails && (
        <CommunityGuidelinesModal onClose={() => setShowDetails(false)} />
      )}
    </div>
  );
}
