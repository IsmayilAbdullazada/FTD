import { Audience, ClinicalResource } from '@/types';
import { X } from 'lucide-react';

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
  newPdfFile,
  setNewPdfFile,
  handleCreateGuide,
}: Props) {
  return (
    <>
      {/* DR. SEEMA ADD SOURCE MODAL */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default transition-colors"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Add Care Source / Protocol
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Publish verified guidance to the caregiver knowledge base and
                  assistant.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreateGuide}
              className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
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
                  <option value="CAREGIVER_SUPPORT">
                    Caregiver Support & Wellbeing
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
                  rows={3}
                  value={newKeyTakeaways}
                  onChange={(e) => setNewKeyTakeaways(e.target.value)}
                  placeholder="Consult speech-language pathologist early&#10;Tuck chin downward while swallowing&#10;Avoid straw use for thin liquids"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Which care partners will see this guide?
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
                      className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold transition cursor-pointer ${
                        newAudience === value
                          ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  External Citation
                </label>
                <input
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
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newAudience}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
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
