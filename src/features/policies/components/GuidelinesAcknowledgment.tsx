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
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <input
        id="guidelines-agreement"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#002D72]"
      />

      <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <label htmlFor="guidelines-agreement">
          I have read and agree to follow the{' '}
        </label>
        {onViewGuidelines ? (
          <button
            type="button"
            onClick={onViewGuidelines}
            className="font-semibold text-[#002D72] underline dark:text-blue-300"
          >
            Community Guidelines
          </button>
        ) : (
          <a
            href="/community-guidelines"
            className="font-semibold text-[#002D72] underline dark:text-blue-300"
          >
            Community Guidelines
          </a>
        )}
        .
      </div>
    </div>
  );
}
