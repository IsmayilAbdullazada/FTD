import { isGuideDescriptionValid } from '../lib/guideDescription';
import { Button, fieldClassName } from '@/shared/components/Button';
import { GuideMetadataFields } from './GuideMetadataFields';
import type { GuideUploadDialogProps } from './guideDialog.types';
import { TechnicalGuideUploadDialog } from './TechnicalGuideUploadDialog';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

export function GuideUploadDialog(props: GuideUploadDialogProps) {
  if (props.isAdmin && !props.textMode)
    return <TechnicalGuideUploadDialog {...props} />;
  return <PlainGuideUploadDialog {...props} />;
}
function PlainGuideUploadDialog(p: GuideUploadDialogProps) {
  const close = () => {
    if (!p.uploading && !p.extractingPdf) p.onClose();
  };
  const ref = useDialogFocus(p.open, close);
  if (!p.open) return null;
  const ready = Boolean(
    p.textMode
      ? p.textContent?.trim()
      : p.pdfPreviewUrl || p.pages.some((page) => page.text.trim()),
  );
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4"
      onClick={close}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-editor-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white"
      >
        <header className="flex items-center justify-between gap-3 border-b p-4 dark:border-slate-700">
          <h2 id="guide-editor-title" className="text-lg font-semibold">
            {p.editingGuideId
              ? 'Edit guide'
              : p.textMode
                ? 'Write a guide'
                : 'Upload guide'}
          </h2>
          <Button type="button" aria-label="Close guide" onClick={close}>
            ✕
          </Button>
        </header>
        <div className="overflow-y-auto p-4 sm:p-6">
          <p className="mb-4 text-sm">
            Approved guides are visible to care partners in Guides.
          </p>
          <div className="grid gap-5 lg:grid-cols-2">
            <div
              onDragEnter={p.onDrag}
              onDragLeave={p.onDrag}
              onDragOver={p.onDrag}
              onDrop={p.onDrop}
              className="space-y-3"
            >
              {p.textMode ? (
                <label className="block text-sm font-semibold">
                  Guide text
                  <textarea
                    className={`mt-2 min-h-64 ${fieldClassName}`}
                    rows={12}
                    value={p.textContent ?? ''}
                    onChange={(event) => p.onTextChange?.(event.target.value)}
                    placeholder="Write or paste your guide here…"
                  />
                </label>
              ) : (
                <label className="block text-sm font-semibold">
                  PDF or text document
                  <input
                    ref={p.fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="mt-2 block w-full min-h-11 text-sm"
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        p.onProcessFile(e.target.files[0]);
                    }}
                  />
                </label>
              )}
              <p role="status" className="text-sm">
                {p.extractingPdf
                  ? 'Reading your PDF…'
                  : ready
                    ? p.fileName.toLowerCase().endsWith('.pdf')
                      ? 'PDF ready'
                      : 'Document ready'
                    : 'Choose a PDF or text document.'}
              </p>
              {p.pdfPreviewUrl && (
                <>
                  <a
                    className="inline-flex min-h-11 items-center underline"
                    href={p.pdfPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open PDF guide
                  </a>
                  <iframe
                    title="PDF preview"
                    src={p.pdfPreviewUrl}
                    className="h-64 w-full rounded-lg border lg:h-96"
                  />
                </>
              )}
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Title
                <input
                  aria-label="Title"
                  placeholder="e.g. Managing Aggressive Behavior in FTD"
                  className={`mt-1 ${fieldClassName}`}
                  value={p.title}
                  onChange={(e) => p.onTitleChange(e.target.value)}
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">
                  Who is this guide for?
                </legend>
                <div className="flex flex-wrap gap-2">
                  {(['FTD', 'AD', 'GENERAL'] as const).map((condition) => (
                    <Button
                      type="button"
                      key={condition}
                      aria-pressed={p.condition === condition}
                      variant={
                        p.condition === condition ? 'primary' : 'secondary'
                      }
                      onClick={() => p.onConditionChange(condition)}
                    >
                      {condition === 'GENERAL'
                        ? 'All care partners (FTD and AD)'
                        : condition}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <GuideMetadataFields
                metadata={p.metadata}
                onMetadataChange={p.onMetadataChange}
              />
            </div>
          </div>
        </div>
        <footer className="flex flex-wrap justify-end gap-3 border-t p-4 dark:border-slate-700">
          <Button
            type="button"
            disabled={
              !isGuideDescriptionValid(p.metadata?.description) ||
              !ready ||
              !p.title.trim() ||
              !p.condition ||
              p.uploading ||
              p.extractingPdf
            }
            onClick={() => p.onSave('DRAFT')}
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            disabled={
              !isGuideDescriptionValid(p.metadata?.description) ||
              !ready ||
              !p.title.trim() ||
              !p.condition ||
              p.uploading ||
              p.extractingPdf
            }
            variant="primary"
            onClick={() => p.onSave('APPROVED')}
          >
            {p.uploading ? 'Saving…' : 'Approve'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
