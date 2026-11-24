import { Button, fieldClassName } from '@/shared/components/Button';
import { useEffect, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { guideApi } from '@/features/knowledge/api/guideApi';
import type { ChatbotGuideTestResult } from '@/features/knowledge/types';
import { MutationDialog } from './MutationDialog';
import type { AdminIntent } from '../types';
export function AdminDiagnosticsPanel() {
  const [data, setData] = useState<Awaited<
      ReturnType<typeof adminApi.diagnostics>
    > | null>(null),
    [query, setQuery] = useState(''),
    [result, setResult] = useState<ChatbotGuideTestResult | null>(null),
    [error, setError] = useState<string | null>(null),
    [reason, setReason] = useState(''),
    [intent, setIntent] = useState<AdminIntent | null>(null),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void adminApi
      .diagnostics()
      .then((data) => {
        if (active) setData(data);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  function action(id: string, args: Record<string, unknown>) {
    if (reason.trim().length < 10) {
      setError('Write a reason of at least 10 characters.');
      return;
    }
    setIntent({ operation: { kind: 'action', action: id, args }, reason });
  }
  async function test() {
    setBusy(true);
    try {
      setResult(await guideApi.testChatbotGuideRetrieval(query));
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Query failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold">Diagnostics</h2>
      {error && <p role="alert">{error}</p>}
      <section className="space-y-3 rounded border p-4">
        <h3 className="font-semibold">Care Companion test chat</h3>
        <label className="block">
          Test query
          <input
            className={`mt-1 ${fieldClassName}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Button
          disabled={query.trim().length < 2 || busy}
          onClick={() => void test()}
        >
          {busy ? 'Searching…' : 'Run test query'}
        </Button>
        {result && (
          <>
            <p>
              {result.answer || 'Retrieval results (no generated response)'}
            </p>
            <h4 className="font-semibold">Retrieved chunks and scores</h4>
            {result.retrievedChunks?.map((chunk, index) => (
              <article
                key={index}
                className="space-y-2 rounded bg-slate-100 p-3 text-sm dark:bg-slate-800"
              >
                <strong>
                  {chunk.guideTitle} · page {chunk.page} · score {chunk.score}
                </strong>
                <p className="whitespace-pre-wrap">{chunk.content}</p>
              </article>
            ))}
            <h4>Citations</h4>
            {result.citedResources?.map((citation, index) => (
              <a
                className="block min-h-11 underline"
                key={index}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {citation.title}, page {citation.page}
              </a>
            ))}
          </>
        )}
      </section>
      <label className="block">
        Reason for maintenance
        <textarea
          aria-label="Reason for maintenance"
          className={`mt-1 min-h-24 ${fieldClassName}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <section className="space-y-3">
        <h3 className="font-semibold">Guide search indexes</h3>
        {data?.guides.map((guide) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"
            key={guide.id}
          >
            <div>
              <strong>{guide.title}</strong>
              <p className="text-sm">
                {guide.status} · {guide.word_count || 0} words ·{' '}
                {guide.total_chunks} chunks ·{' '}
                {guide.is_active ? 'active' : 'inactive'}
              </p>
            </div>
            <Button onClick={() => action('rebuild-guide', { id: guide.id })}>
              Rebuild search index
            </Button>
          </div>
        ))}
      </section>
      <section>
        <h3 className="font-semibold">Unreferenced uploads (up to 200)</h3>
        <pre
          tabIndex={0}
          className="my-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs"
        >
          {JSON.stringify(data?.orphanUploads || [], null, 2)}
        </pre>
        <Button onClick={() => action('delete-orphan-uploads', {})}>
          Preview aged upload cleanup
        </Button>
      </section>
      {intent && (
        <MutationDialog
          intent={intent}
          onClose={() => setIntent(null)}
          onDone={() => {
            setIntent(null);
            setRevision(revision + 1);
          }}
        />
      )}
    </section>
  );
}
