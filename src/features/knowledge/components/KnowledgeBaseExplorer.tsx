import { AudienceBadge } from '@/shared/components/AudienceBadge';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import React from 'react';
import { CreateResourceDialog } from './CreateResourceDialog';
import { ResourceInspectorDialogs } from './ResourceInspectorDialogs';

import {
  useKnowledgeResources,
  type KnowledgeBaseExplorerProps,
} from '../hooks/useKnowledgeResources';
export const KnowledgeBaseExplorer: React.FC<KnowledgeBaseExplorerProps> = ({
  initialResourceId,
  onClearInitialResource,
  currentUser,
}) => {
  const {
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    activeResource,
    setActiveResource,
    newAudience,
    setNewAudience,
    pendingDelete,
    setPendingDelete,
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
    successToast,
    toastTone,
    formError,
    setFormError,
    newPdfFile,
    setNewPdfFile,
    isClinician,
    categories,
    filtered,
    handleCreateGuide,
    handleDeleteGuide,
  } = useKnowledgeResources({
    initialResourceId,
    onClearInitialResource,
    currentUser,
  });

  const deleteDialogRef = useDialogFocus(
    Boolean(isClinician && pendingDelete),
    () => setPendingDelete(null),
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Guides & Care Sheets
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Care team resources</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Trauma-informed, non-pharmacological protocols curated by Johns
            Hopkins specialists.
          </p>
        </div>

        {/* Clinician Action: Add Guide */}
        {isClinician && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Guide</span>
          </button>
        )}

        {isClinician && pendingDelete && (
          <div
            onClick={() => setPendingDelete(null)}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-[60] flex items-center justify-center p-4 cursor-pointer"
          >
            <div
              ref={deleteDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Delete guide confirmation"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 cursor-default outline-none"
            >
              <div className="space-y-1.5">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Delete this guide?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  "{pendingDelete.title}" will be removed for all care partners.
                  This can't be undone.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGuide(pendingDelete)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {successToast && (
        <div
          role={toastTone === 'error' ? 'alert' : 'status'}
          className={`border text-sm px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in ${
            toastTone === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <span>{successToast}</span>
          {toastTone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
        </div>
      )}

      {/* FILTER AND SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search toileting, bathing agitation, Medicaid, wandering safety..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
          />
        </div>

        {/* Clean Dropdown Filter for Disciplines */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="discipline-select"
            className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium"
          >
            Topic:
          </label>
          <select
            id="discipline-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 shadow-2xs cursor-pointer"
          >
            {categories.map((cat) => (
              <option
                key={cat.key}
                value={cat.key}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RESOURCES LIST */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-sm">
          Loading care guides &amp; protocols...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400 text-sm space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            No resources found matching your search.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
            Try using different keywords or selecting "All Topics".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((res) => (
            <article
              key={res.id}
              onClick={() => setActiveResource(res)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group text-left"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-[#002D72] dark:text-blue-400">
                    {categories.find((c) => c.key === res.category)?.label ||
                      res.category}
                  </span>
                  {isClinician && (
                    <AudienceBadge condition={res.diseaseDomain} />
                  )}
                  <div className="ml-auto flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(res.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {isClinician && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(res);
                        }}
                        aria-label="Delete guide"
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-serif font-semibold text-lg sm:text-xl text-slate-900 dark:text-white leading-snug group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                  {res.title}
                </h3>

                <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-sans">
                  {res.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
                <div className="flex flex-wrap items-center gap-2">
                  {res.fileAttachmentUrl && (
                    <span className="inline-flex items-center gap-1 text-[#002D72] dark:text-blue-400">
                      <FileText className="w-4 h-4" />
                      PDF available
                    </span>
                  )}
                  {res.externalUrl && (
                    <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <ExternalLink className="w-4 h-4" />
                      Website
                    </span>
                  )}
                  {res.additionalLinks?.length ? (
                    <span className="text-slate-500 dark:text-slate-400">
                      +{res.additionalLinks.length} more link
                      {res.additionalLinks.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
                <span className="text-[#002D72] dark:text-blue-400 group-hover:underline shrink-0">
                  View guide →
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <ResourceInspectorDialogs
        activeResource={activeResource}
        setActiveResource={setActiveResource}
        isClinician={isClinician}
        categories={categories}
        onClearInitialResource={onClearInitialResource}
      />
      <CreateResourceDialog
        newAudience={newAudience}
        setNewAudience={setNewAudience}
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newSummary={newSummary}
        setNewSummary={setNewSummary}
        newContentBody={newContentBody}
        setNewContentBody={setNewContentBody}
        newKeyTakeaways={newKeyTakeaways}
        setNewKeyTakeaways={setNewKeyTakeaways}
        newExternalUrl={newExternalUrl}
        setNewExternalUrl={setNewExternalUrl}
        newAdditionalLinks={newAdditionalLinks}
        setNewAdditionalLinks={setNewAdditionalLinks}
        isSubmitting={isSubmitting}
        formError={formError}
        setFormError={setFormError}
        newPdfFile={newPdfFile}
        setNewPdfFile={setNewPdfFile}
        handleCreateGuide={handleCreateGuide}
      />
    </div>
  );
};
