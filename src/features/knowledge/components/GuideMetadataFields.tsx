import { useId } from 'react';
import {
  MIN_GUIDE_DESCRIPTION_LENGTH,
  MAX_GUIDE_DESCRIPTION_LENGTH,
} from '../lib/guideDescription';
import { fieldClassName } from '@/shared/components/Button';
import { GuideTopicSelect } from './GuideTopicSelect';
import type { GuideUploadDialogProps } from './guideDialog.types';
export function GuideMetadataFields({
  metadata,
  onMetadataChange,
}: Pick<GuideUploadDialogProps, 'metadata' | 'onMetadataChange'>) {
  const descriptionId = useId();
  if (!metadata) return null;
  return (
    <>
      <GuideTopicSelect
        value={metadata.category}
        onChange={(category) => onMetadataChange?.({ ...metadata, category })}
      />
      <div>
        <label
          htmlFor={descriptionId}
          className="mb-1.5 block text-sm font-semibold"
        >
          Short description
        </label>
        <textarea
          id={descriptionId}
          required
          minLength={MIN_GUIDE_DESCRIPTION_LENGTH}
          maxLength={MAX_GUIDE_DESCRIPTION_LENGTH}
          rows={3}
          className={fieldClassName}
          value={metadata.description}
          aria-describedby={`${descriptionId}-help`}
          onChange={(event) =>
            onMetadataChange?.({ ...metadata, description: event.target.value })
          }
        />
        <p
          id={`${descriptionId}-help`}
          className="mt-1 text-xs text-slate-600 dark:text-slate-400"
        >
          20–240 characters. A short, plain-language overview shown on the guide
          card.
        </p>
      </div>
      {(
        [
          ['publisher', 'Publisher'],
          ['year', 'Publication year'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block text-sm font-semibold">
          {label}
          <input
            className={`mt-1 ${fieldClassName}`}
            value={metadata[key]}
            onChange={(event) =>
              onMetadataChange?.({ ...metadata, [key]: event.target.value })
            }
          />
        </label>
      ))}
    </>
  );
}
