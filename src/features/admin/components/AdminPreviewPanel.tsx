import { Button, fieldClassName } from '@/shared/components/Button';
import { useEffect, useRef, useState } from 'react';
import { adminApi } from '../api/adminApi';
import type { PreviewTarget } from '../types';
export function AdminPreviewPanel() {
  const [role, setRole] = useState('CLINICIAN_MODERATOR'),
    [search, setSearch] = useState(''),
    [users, setUsers] = useState<
      {
        id: string;
        first_name: string;
        last_name: string;
        anonymous_handle: string;
        email: string;
        role: string;
      }[]
    >([]),
    [target, setTarget] = useState(''),
    [reason, setReason] = useState(''),
    [error, setError] = useState<string | null>(null),
    [session, setSession] = useState<{
      token: string;
      target: PreviewTarget;
    } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    let active = true;
    void adminApi
      .previewUsers(role, search)
      .then((result) => {
        if (active) setUsers(result.users);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [role, search]);
  useEffect(() => {
    if (!session) return;
    const receive = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'ftd:preview-ready'
      )
        frame.current.contentWindow?.postMessage(
          {
            type: 'ftd:preview-token',
            token: session.token,
            name: session.target.name,
            targetId: session.target.id,
          },
          window.location.origin,
        );
    };
    window.addEventListener('message', receive);
    const expiry = setTimeout(
      () => {
        setSession(null);
        setError('Preview expired. Start a new preview to continue.');
      },
      30 * 60 * 1000,
    );
    return () => {
      window.removeEventListener('message', receive);
      clearTimeout(expiry);
    };
  }, [session]);
  async function start() {
    try {
      if (reason.trim().length < 10)
        throw new Error('Write a reason of at least 10 characters.');
      setSession(await adminApi.startPreview(target, reason));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Preview failed');
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Read-only preview</h2>
      <p className="text-sm">
        The administrator session stays signed in. Preview requests use the
        selected account’s permissions; private messages, notes and email
        addresses are masked.
      </p>
      <div className="flex flex-wrap gap-3">
        {[
          ['CLINICIAN_MODERATOR', 'Moderator view'],
          ['CARE_PARTNER', 'Care partner view'],
        ].map(([value, label]) => (
          <Button
            key={value}
            aria-pressed={role === value}
            onClick={() => {
              setRole(value);
              setTarget('');
              setSession(null);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <label className="block">
        Find account by name, email or tag
        <input
          className={`mt-1 ${fieldClassName}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <label className="block">
        Account
        <select
          aria-label="Account"
          className={`mt-1 ${fieldClassName}`}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Choose account…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name} · {user.anonymous_handle} ·{' '}
              {user.email}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Reason for preview
        <textarea
          aria-label="Reason for preview"
          className={`mt-1 min-h-24 ${fieldClassName}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <Button variant="primary" disabled={!target} onClick={() => void start()}>
        Start read-only preview
      </Button>
      {session && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-amber-100 p-3 text-amber-950">
            <strong>Previewing as {session.target.name} (read-only)</strong>
            <Button onClick={() => setSession(null)}>Close preview</Button>
          </div>
          <iframe
            ref={frame}
            title={
              'Read-only ' +
              (role === 'CARE_PARTNER' ? 'care partner' : 'moderator') +
              ' preview'
            }
            src={
              '/?preview=1&tab=' +
              (role === 'CARE_PARTNER' ? 'feed' : 'moderation')
            }
            className="h-[75dvh] min-h-96 w-full rounded-lg border"
          />
        </div>
      )}
    </section>
  );
}
