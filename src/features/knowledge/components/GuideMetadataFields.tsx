import { fieldClassName } from '@/shared/components/Button';
import { GuideTopicSelect } from './GuideTopicSelect';
import type { GuideUploadDialogProps } from './guideDialog.types';
export function GuideMetadataFields({
  metadata,
  onMetadataChange,
}: Pick<GuideUploadDialogProps, 'metadata' | 'onMetadataChange'>) {
  if (!metadata) return null;
  return (
    <>
      <GuideTopicSelect
        value={metadata.category}
        onChange={(category) => onMetadataChange?.({ ...metadata, category })}
      />
      {(
        [
          ['description', 'Summary'],
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
