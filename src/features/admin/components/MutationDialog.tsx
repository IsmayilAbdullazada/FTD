import { useEffect, useState } from 'react';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { ApiError } from '@/shared/api/httpClient';
import { adminApi } from '../api/adminApi';
import type { AdminIntent, MutationPreview } from '../types';
export function MutationDialog({
  intent,
  onClose,
  onDone,
}: {
  intent: AdminIntent;
  onClose: () => void;
  onDone: (auditId: string) => void;
}) {
  const [preview, setPreview] = useState<MutationPreview | null>(null),
    [error, setError] = useState<string | null>(null),
    [confirmation, setConfirmation] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false);
  const ref = useDialogFocus(true, () => {
    if (!busy) onClose();
  });
  useEffect(() => {
    let active = true;
    void adminApi
      .preview(intent)
      .then((value) => {
        if (active) setPreview(value);
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error.message : 'Preview failed');
      });
    return () => {
      active = false;
    };
  }, [intent]);
  async function commit() {
    if (!preview || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (preview.requiresPassword) {
        await adminApi.reauthenticate(password);
        setPassword('');
      }
      const result = await adminApi.commit(
        intent,
        preview.previewToken,
        confirmation,
      );
      onDone(result.auditId);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ADMIN_REAUTH_REQUIRED')
        setPreview({ ...preview, requiresPassword: true });
      setError(error instanceof Error ? error.message : 'Change failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mutation-title"
        className="max-h-[94dvh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white"
      >
        <h2 id="mutation-title" className="text-lg font-semibold">
          Review proposed change
        </h2>
        {error && (
          <p role="alert" className="my-3 text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {!preview && !error && <p role="status">Preparing preview…</p>}
        {preview && (
          <>
            <p className="my-3">
              {preview.rowsAffected} selected record(s) in{' '}
              <strong>{preview.table}</strong>.
            </p>
            <p className="text-sm">
              Changes are checked again before they are saved. Protected text
              stays masked in this preview.
            </p>
            <div className="my-4 grid gap-3 md:grid-cols-2">
              <section>
                <h3 className="font-semibold">Before</h3>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
                  {JSON.stringify(preview.before, null, 2)}
                </pre>
              </section>
              <section>
                <h3 className="font-semibold">After / requested action</h3>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
                  {JSON.stringify(preview.after, null, 2)}
                </pre>
              </section>
            </div>
            {!!preview.relationships.length && (
              <section>
                <h3 className="font-semibold">Referenced rows if deleted</h3>
                <ul>
                  {preview.relationships.map((r, i) => (
                    <li key={i}>
                      {r.table}: {r.count} ({r.onDelete})
                    </li>
                  ))}
                </ul>
                <p className="text-xs">
                  These are direct relationships. Cascading deletes may also
                  affect their dependent records.
                </p>
              </section>
            )}
            <p className="my-3 text-sm">Reason: {intent.reason}</p>
            {preview.requiresPassword && (
              <label className="mb-3 block text-sm">
                Confirm your current password
                <input
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 min-h-11 w-full rounded border bg-transparent p-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            <label className="block text-sm">
              Type {preview.table} to confirm
              <input
                className="mt-1 min-h-11 w-full rounded border bg-transparent p-2"
                autoComplete="off"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
          </>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="min-h-11 rounded border px-4"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="min-h-11 rounded bg-blue-900 px-4 text-white disabled:opacity-50"
            disabled={
              !preview ||
              busy ||
              confirmation !== preview.table ||
              (preview.requiresPassword && !password)
            }
            onClick={() => void commit()}
          >
            {busy ? 'Saving…' : 'Confirm change'}
          </button>
        </div>
      </div>
    </div>
  );
}
