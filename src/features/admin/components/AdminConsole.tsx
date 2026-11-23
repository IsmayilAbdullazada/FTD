import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { AdminDataPanel } from './AdminDataPanel';
import { AdminActionsPanel } from './AdminActionsPanel';
import { AdminPreviewPanel } from './AdminPreviewPanel';
import { AdminDiagnosticsPanel } from './AdminDiagnosticsPanel';
import type { AdminPage } from '../types';
const sections = [
  'Overview',
  'Data',
  'Actions',
  'Preview',
  'Diagnostics',
  'Audit log',
] as const;
export function AdminConsole() {
  const [section, setSection] = useState<(typeof sections)[number]>('Overview'),
    [registry, setRegistry] = useState<Awaited<
      ReturnType<typeof adminApi.registry>
    > | null>(null),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void adminApi
      .registry()
      .then((value) => {
        if (active) setRegistry(value);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6">
      <h1 className="text-2xl font-semibold">CS Admin console</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Administrative changes are audited. Protected text is masked until you
        explicitly reveal it.
      </p>
      <nav aria-label="Admin console sections" className="flex flex-wrap gap-2">
        {sections.map((name) => (
          <button
            className={`min-h-11 rounded-lg border px-4 text-sm ${section === name ? 'bg-blue-900 text-white' : ''}`}
            aria-current={section === name ? 'page' : undefined}
            key={name}
            onClick={() => setSection(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="rounded border border-red-300 p-4">
          {error}
        </p>
      )}
      {!registry && !error && <p role="status">Loading console…</p>}
      {registry && (
        <>
          {section === 'Overview' && <Overview />}
          {section === 'Data' && <AdminDataPanel tables={registry.tables} />}
          {section === 'Actions' && (
            <AdminActionsPanel actions={registry.actions} />
          )}
          {section === 'Preview' && <AdminPreviewPanel />}
          {section === 'Diagnostics' && <AdminDiagnosticsPanel />}
          {section === 'Audit log' && <AuditLog />}
        </>
      )}
    </div>
  );
}
function Overview() {
  const [data, setData] = useState<Record<string, unknown> | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    void adminApi
      .overview()
      .then(setData)
      .catch((error) => setError(error.message));
  }, []);
  return (
    <section>
      <h2 className="text-lg font-semibold">Overview</h2>
      {error && <p role="alert">{error}</p>}
      <pre className="my-4 max-h-[65dvh] overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-4 text-sm dark:bg-slate-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
function AuditLog() {
  const [page, setPage] = useState(1),
    [data, setData] = useState<AdminPage | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void adminApi
      .audit(page)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [page]);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Append-only audit log</h2>
      {error && <p role="alert">{error}</p>}
      {data?.items.map((row) => (
        <article key={String(row.id)} className="rounded border p-3">
          <strong>
            {String(row.action)} · {String(row.target_table || '')}
          </strong>
          <p>
            {String(row.created_at)} · actor {String(row.actor_id)}
          </p>
          <p>{String(row.reason)}</p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(
              {
                before: row.before,
                after: row.after,
                requestId: row.request_id,
              },
              null,
              2,
            )}
          </pre>
        </article>
      ))}
      <div className="flex items-center gap-3">
        <button
          className="min-h-11 rounded border px-4"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          className="min-h-11 rounded border px-4"
          disabled={!data || page * 50 >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
