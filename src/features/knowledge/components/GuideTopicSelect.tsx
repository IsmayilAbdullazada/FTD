import { useId } from 'react';
import { fieldClassName } from '@/shared/components/Button';
import { GUIDE_TOPICS, normalizeGuideTopic } from '../lib/guideTopics';
export function GuideTopicSelect({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300"
      >
        Topic
      </label>
      <select
        id={id}
        className={fieldClassName}
        value={normalizeGuideTopic(value)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select a topic (optional)</option>
        {GUIDE_TOPICS.map((topic) => (
          <option key={topic.key} value={topic.key}>
            {topic.label}
          </option>
        ))}
      </select>
    </div>
  );
}
