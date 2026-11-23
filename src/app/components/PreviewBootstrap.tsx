import { useEffect, useState, type ReactNode } from 'react';
import { setPreviewSession, getPreviewSession } from '@/shared/api/httpClient';
export function PreviewBootstrap({ children }: { children: ReactNode }) {
  const embedded =
    window.self !== window.top &&
    new URLSearchParams(window.location.search).get('preview') === '1';
  const [ready, setReady] = useState(!embedded),
    [name, setName] = useState('');
  useEffect(() => {
    if (!embedded) return;
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== 'ftd:preview-token' ||
        typeof event.data.token !== 'string' ||
        typeof event.data.targetId !== 'string'
      )
        return;
      const name = String(event.data.name || 'selected account');
      setPreviewSession(event.data.token, name, event.data.targetId);
      setName(name);
      const url = new URL(window.location.href);
      url.searchParams.delete('previewToken');
      url.hash = '';
      window.history.replaceState({}, '', url);
      setReady(true);
    };
    window.addEventListener('message', receive);
    window.parent.postMessage(
      { type: 'ftd:preview-ready' },
      window.location.origin,
    );
    return () => {
      window.removeEventListener('message', receive);
      setPreviewSession(null);
    };
  }, [embedded]);
  if (!ready)
    return (
      <p role="status" className="p-5">
        Preparing read-only preview…
      </p>
    );
  return (
    <>
      {getPreviewSession() && (
        <div
          role="status"
          className="sticky top-0 z-[100] bg-amber-100 p-3 text-center text-sm font-semibold text-amber-950"
        >
          Previewing as {name} (read-only)
        </div>
      )}
      {children}
    </>
  );
}
