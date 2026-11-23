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
            aria-label="Add Care Source or Protocol"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default transition-colors outline-none"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Add Care Source / Protocol
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Publish verified guidance to the care partner knowledge base
                  and assistant.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={handleClose}
                className="min-h-11 min-w-11 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 cursor-pointer"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Care Protocol Content
                </label>
                <textarea
                  aria-label="Full Care Protocol Content"
                  rows={6}
                  value={newContentBody}
                  onChange={(e) => setNewContentBody(e.target.value)}
                  placeholder="Detailed step-by-step guidance, de-escalation methods, safety warnings..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 font-sans"
                  required
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
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
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewAudience(value)}
                      className={`min-h-11 min-w-11 w-full px-3 py-2 border rounded-lg text-xs font-semibold transition cursor-pointer ${
                        newAudience === value
                          ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {!newAudience && (
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Select an audience to enable publishing.
                  </p>
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
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
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
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
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-11 min-w-11 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newAudience}
                  className="min-h-11 min-w-11 px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Guide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
