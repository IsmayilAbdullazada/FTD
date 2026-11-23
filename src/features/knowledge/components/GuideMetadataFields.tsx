import type { GuideUploadDialogProps } from './guideDialog.types';
export function GuideMetadataFields({
  metadata,
  onMetadataChange,
}: Pick<GuideUploadDialogProps, 'metadata' | 'onMetadataChange'>) {
  if (!metadata) return null;
  return (
    <>
      {Object.entries(metadata).map(([key, value]) => (
        <label key={key} className="block text-sm font-semibold capitalize">
          {key}
          <input
            className="mt-1 min-h-11 w-full rounded-lg border bg-transparent p-2"
            value={value}
            onChange={(event) =>
              onMetadataChange?.({ ...metadata, [key]: event.target.value })
            }
          />
        </label>
      ))}
    </>
  );
}
