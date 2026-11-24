import { assistantAnswer } from '../lib/assistantAnswer';
import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Button, fieldClassName } from '@/shared/components/Button';
import { guideApi } from '../api/guideApi';
import type { ChatbotGuideTestResult } from '../types';

const examples = [
  'How can I make bathing less stressful?',
  'How can we keep someone safe if they wander?',
  'What should I do about threatening behavior?',
  'Can I change a medication dose?',
];
export function AssistantGuidanceTester() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ChatbotGuideTestResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(question: string) {
    if (!question.trim() || pending) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await guideApi.testChatbotGuideRetrieval(question.trim()));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not test guidance. Please try again.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section
      aria-labelledby="assistant-guidance-heading"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-blue-50 p-2.5 text-[#002D72] dark:bg-blue-950 dark:text-blue-300">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div>
          <h2
            id="assistant-guidance-heading"
            className="font-serif text-xl font-semibold text-slate-900 dark:text-white"
          >
            Test Assistant Guidance
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Try a question to see how Care Companion uses approved guides.
          </p>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(query);
        }}
        className="space-y-3"
      >
        <label
          htmlFor="assistant-test-question"
          className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
        >
          Your test question
        </label>
        <textarea
          id="assistant-test-question"
          required
          maxLength={2000}
          rows={3}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={fieldClassName}
          placeholder="Ask a question a care partner might have…"
        />
        <Button
          variant="primary"
          type="submit"
          disabled={pending || !query.trim()}
        >
          <Send className="h-4 w-4" />
          {pending ? 'Testing guidance…' : 'Test Guidance'}
        </Button>
      </form>
      <div className="flex flex-wrap gap-2" aria-label="Example test questions">
        {examples.map((question) => (
          <Button
            key={question}
            disabled={pending}
            className="text-left"
            onClick={() => {
              setQuery(question);
              void run(question);
            }}
          >
            {question}
          </Button>
        ))}
      </div>
      {pending && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          Checking approved guides…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </p>
      )}
      {result && (
        <div
          role="region"
          aria-label="Assistant test answer"
          className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-slate-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-200"
        >
          <h3 className="font-semibold">Assistant answer</h3>
          <p className="whitespace-pre-wrap">{assistantAnswer(result)}</p>
          {Boolean(result.discussions?.length) && (
            <div>
              <h4 className="font-semibold">Related discussions</h4>
              <ul className="mt-1 space-y-1">
                {result.discussions?.map((discussion) => (
                  <li key={discussion.id}>
                    <a
                      href={discussion.url}
                      className="inline-flex min-h-11 items-center rounded-lg font-medium text-[#002D72] underline underline-offset-4 dark:text-blue-300"
                    >
                      {discussion.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Boolean(result.citedResources?.length) && (
            <div>
              <h4 className="font-semibold">Sources</h4>
              <ul className="mt-1 space-y-1">
                {result.citedResources?.map((source) => (
                  <li key={`${source.id}:${source.page ?? ''}`}>
                    <a
                      className="inline-flex min-h-11 items-center rounded-lg font-medium text-[#002D72] underline underline-offset-4 dark:text-blue-300"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title}
                      {source.page ? ` · Page ${source.page}` : ''}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
