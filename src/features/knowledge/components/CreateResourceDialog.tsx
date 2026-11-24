import { Button, fieldClassName } from '@/shared/components/Button';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { Audience, ClinicalResource } from '@/types';
import { AlertCircle, X } from 'lucide-react';

import type { useKnowledgeResources } from '../hooks/useKnowledgeResources';

type Props = Pick<
  ReturnType<typeof useKnowledgeResources>,
  | 'newAudience'
  | 'setNewAudience'
  | 'showAddModal'
  | 'setShowAddModal'
  | 'newTitle'
  | 'setNewTitle'
  | 'newCategory'
  | 'setNewCategory'
  | 'newSummary'
  | 'setNewSummary'
  | 'newContentBody'
  | 'setNewContentBody'
  | 'newKeyTakeaways'
  | 'setNewKeyTakeaways'
  | 'newExternalUrl'
  | 'setNewExternalUrl'
  | 'newAdditionalLinks'
  | 'setNewAdditionalLinks'
  | 'isSubmitting'
  | 'formError'
  | 'setFormError'
  | 'newPdfFile'
  | 'setNewPdfFile'
  | 'handleCreateGuide'
>;
export function CreateResourceDialog({
  newAudience,
  setNewAudience,
  showAddModal,
  setShowAddModal,
  newTitle,
  setNewTitle,
  newCategory,
  setNewCategory,
  newSummary,
  setNewSummary,
  newContentBody,
  setNewContentBody,
  newKeyTakeaways,
  setNewKeyTakeaways,
  newExternalUrl,
  setNewExternalUrl,
  newAdditionalLinks,
  setNewAdditionalLinks,
  isSubmitting,
  formError,
  setFormError,
  newPdfFile,
  setNewPdfFile,
  handleCreateGuide,
}: Props) {
  const handleClose = () => {
    if (isSubmitting) return;
    setFormError(null);
    setShowAddModal(false);
  };
  const dialogRef = useDialogFocus(showAddModal, handleClose);

  return (
    <>
      {showAddModal && (
        <div
          onClick={handleClose}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Add webpage guide"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default transition-colors outline-none"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Add webpage guide
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Publish a source link in Guides for the selected care
                  partners.
                </p>
              </div>
              <Button
                type="button"
                aria-label="Close dialog"
                onClick={handleClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form
              onSubmit={handleCreateGuide}
              className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1"
            >
              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  aria-label="Title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Swallowing Assessment & Choking Prevention in bvFTD"
                  className={fieldClassName}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discipline / Category
                </label>
                <select
                  aria-label="Discipline / Category"
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(
                      e.target.value as ClinicalResource['category'],
                    )
                  }
                  className={fieldClassName}
                >
                  <option value="BEHAVIORAL_AGITATION">
                    Sensory & Agitation
                  </option>
                  <option value="INCONTINENCE">Toileting & Incontinence</option>
                  <option value="SAFETY_WANDERING">
                    Wandering & Driving Safety
                  </option>
                  <option value="LEGAL_MEDICAID">
                    Legal & Medicaid Spend-Down
                  </option>
                  <option value="COMMUNICATION_PPA">
                    Speech & Communication (PPA)
                  </option>
                  <option value="NUTRITION_DIET">Nutrition & Swallowing</option>
                  <option value="CARE_PARTNER_SUPPORT">
                    Care Partner Support & Wellbeing
                  </option>
                  <option value="DAILY_CARE">Daily Care & Routines</option>
                  <option value="GENERAL_EDUCATION">
                    General Dementia Education
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brief Summary / Abstract
                </label>
                <textarea
                  aria-label="Brief Summary / Abstract"
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Short 1-2 sentence overview shown in search results..."
                  className={fieldClassName}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional context (optional)
                </label>
                <textarea
                  aria-label="Additional context (optional)"
                  rows={6}
                  value={newContentBody}
                  onChange={(e) => setNewContentBody(e.target.value)}
                  placeholder="Optional background about this source…"
                  className={fieldClassName}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Key Recommendations (one per line)
                </label>
                <textarea
                  aria-label="Key Recommendations (one per line)"
                  rows={3}
                  value={newKeyTakeaways}
                  onChange={(e) => setNewKeyTakeaways(e.target.value)}
                  placeholder="Consult speech-language pathologist early&#10;Tuck chin downward while swallowing&#10;Avoid straw use for thin liquids"
                  className={fieldClassName}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Which care partners will see this guide?{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['FTD', 'FTD'],
                      ['AD', "Alzheimer's"],
                      ['BOTH', 'Both'],
                    ] as [Audience, string][]
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      onClick={() => setNewAudience(value)}
                      variant={newAudience === value ? 'primary' : 'secondary'}
                      aria-pressed={newAudience === value}
                      className="w-full"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                {!newAudience && (
                  <p>Select an audience to enable publishing.</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  External Citation
                </label>
                <input
                  aria-label="External Citation"
                  type="url"
                  value={newExternalUrl}
                  onChange={(e) => setNewExternalUrl(e.target.value)}
                  placeholder="https://www.theaftd.org/..."
                  className={fieldClassName}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional website links (one per line: Label | URL)
                </label>
                <textarea
                  aria-label="Additional website links (one per line: Label | URL)"
                  rows={3}
                  value={newAdditionalLinks}
                  onChange={(e) => setNewAdditionalLinks(e.target.value)}
                  placeholder={
                    'AFTD driving guidance | https://www.theaftd.org/help-and-hope/hs-driving-and-ftd/\nAnother source | https://example.org'
                  }
                  className={fieldClassName}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PDF Resource (Optional)
                </label>
                <input
                  aria-label="PDF Resource (Optional)"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setNewPdfFile(e.target.files?.[0] ?? null)}
                  className={fieldClassName}
                />
                {newPdfFile && (
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Selected: {newPdfFile.name}
                  </p>
                )}
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  Upload a PDF, or provide a webpage URL above. At least one
                  source is required.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !newAudience}
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Guide'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
