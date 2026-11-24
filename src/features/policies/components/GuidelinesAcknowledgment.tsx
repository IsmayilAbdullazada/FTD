import { useId, useState } from 'react';
import { CommunityGuidelinesModal } from './CommunityGuidelinesModal';

interface GuidelinesAcknowledgmentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onViewGuidelines?: () => void;
}
export function GuidelinesAcknowledgment({
  checked,
  onChange,
  onViewGuidelines,
}: GuidelinesAcknowledgmentProps) {
  const id = useId();
  const [showGuidelines, setShowGuidelines] = useState(false);
  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <label
          htmlFor={id}
          className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
        >
          <input
            id={id}
            type="checkbox"
            required
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#002D72] dark:accent-blue-500"
          />
          <span>
            I have read and agree to follow the Community Guidelines.{' '}
            <span className="font-semibold">(Required)</span>
          </span>
        </label>
        <button
          type="button"
          onClick={onViewGuidelines ?? (() => setShowGuidelines(true))}
          className="ml-7 inline-flex min-h-11 items-center rounded-lg text-left text-sm font-semibold text-[#002D72] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-300"
        >
          Read Community Guidelines
        </button>
      </div>
      {showGuidelines && (
        <CommunityGuidelinesModal onClose={() => setShowGuidelines(false)} />
      )}
    </>
  );
}
