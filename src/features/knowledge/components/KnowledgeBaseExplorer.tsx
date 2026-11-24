import { GuideCard } from './GuideCard';
import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import { Button } from '@/shared/components/Button';
import { AssistantGuidanceTester } from './AssistantGuidanceTester';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { AlertCircle, CheckCircle2, Plus, Search } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { GuideEditor } from './GuideEditor';
import { guideApi } from '../api/guideApi';
import type { ChatbotGuideFile } from '../types';
import type { ClinicalResource } from '@/types';
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
  onResourcesChanged,
}) => {
  const {
    openResourceForm,
    loadResources,
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
    onResourcesChanged,
  });

  const guidePage = usePagination(
    filtered,
    6,
    JSON.stringify([searchQuery, selectedCategory, currentUser?.id]),
  );

  const [showChoices, setShowChoices] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [editingGuide, setEditingGuide] = useState<ChatbotGuideFile>();
  const [guideError, setGuideError] = useState<string | null>(null);
  const [busyGuides, setBusyGuides] = useState<Set<string>>(new Set());
  const [publication, setPublication] = useState<{
    id: number;
    guideId: string;
    title: string;
    wasActive: boolean;
    active: boolean;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const operationId = useRef(0);
  useEffect(() => {
    if (!publication) return;
    const timer = window.setTimeout(
      () =>
        setPublication((current) =>
          current?.id === publication.id ? null : current,
        ),
      6000,
    );
    return () => window.clearTimeout(timer);
  }, [publication]);
  async function undoPublication() {
    if (!publication || undoing) return;
    const operation = publication;
    setUndoing(true);
    setGuideError(null);
    try {
      await guideApi.updateChatbotGuide(operation.guideId, {
        isActive: operation.wasActive,
      });
      await loadResources();
      setPublication((current) =>
        current?.id === operation.id ? null : current,
      );
    } catch (error) {
      setGuideError(
        error instanceof Error
          ? error.message
          : 'Could not undo the publication change.',
      );
    } finally {
      setUndoing(false);
    }
  }
  async function guideAction(
    item: ClinicalResource,
    action: 'edit' | 'approve' | 'toggle',
  ) {
    if (busyGuides.has(item.id)) return;
    setBusyGuides((previous) => new Set(previous).add(item.id));
    try {
      setGuideError(null);
      if (action === 'edit') {
        const result = await guideApi.getChatbotGuides();
        const guide = result.guides.find((g) => g.id === item.id);
        if (!guide) throw new Error('This guide is no longer available.');
        setTextMode(false);
        setEditingGuide(guide);
        setEditorOpen(true);
      } else {
        if (action === 'approve') await guideApi.approveChatbotGuide(item.id);
        else {
          const result = await guideApi.toggleChatbotGuide(item.id);
          setPublication({
            id: ++operationId.current,
            guideId: item.id,
            title: item.title,
            wasActive: !result.guide.isActive,
            active: result.guide.isActive,
          });
        }
        await loadResources();
      }
    } catch (error) {
      setGuideError(
        error instanceof Error ? error.message : 'Could not update this guide.',
      );
    } finally {
      setBusyGuides((previous) => {
        const next = new Set(previous);
        next.delete(item.id);
        return next;
      });
    }
  }
  const deleteDialogRef = useDialogFocus(
    Boolean(isClinician && pendingDelete),
    () => setPendingDelete(null),
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {guideError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {guideError}
        </p>
      )}
      {publication && (
        <div
          role="status"
          className="fixed bottom-24 left-4 right-4 z-[80] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white p-3 pl-4 text-sm text-slate-800 shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 xl:bottom-6"
        >
          <span className="min-w-0 break-words">
            “{publication.title}”{' '}
            {publication.active ? 'published' : 'unpublished'}.
          </span>
          <Button disabled={undoing} onClick={() => void undoPublication()}>
            {undoing ? 'Undoing…' : 'Undo'}
          </Button>
        </div>
      )}
      {editorOpen && currentUser && (
        <GuideEditor
          currentUser={currentUser}
          textMode={textMode}
          guide={editingGuide}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            void loadResources();
          }}
        />
      )}
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Guides
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Approved guides are visible to care partners in Guides.
          </p>
        </div>

        {/* Clinician Action: Add Guide */}
        {isClinician && (
          <Button
            variant="primary"
            onClick={() => setShowChoices(!showChoices)}
            aria-expanded={showChoices}
            aria-controls={showChoices ? 'add-guide-options' : undefined}
          >
            <Plus className="w-4 h-4" />
            <span>Add guide</span>
          </Button>
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
                  "{pendingDelete.title}" will be permanently deleted. This
                  cannot be undone. To hide an uploaded guide temporarily and
                  keep it for later, use Unpublish.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => handleDeleteGuide(pendingDelete)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showChoices && (
        <div
          id="add-guide-options"
          role="group"
          aria-label="Add guide options"
          className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <Button
            variant="secondary"
            onClick={() => {
              setTextMode(false);
              setEditingGuide(undefined);
              setEditorOpen(true);
              setShowChoices(false);
            }}
          >
            Upload PDF or text
          </Button>
          <Button
            onClick={() => {
              setTextMode(true);
              setEditingGuide(undefined);
              setEditorOpen(true);
              setShowChoices(false);
            }}
          >
            Write or paste text
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              openResourceForm();
              setShowChoices(false);
            }}
          >
            Link to a webpage
          </Button>
        </div>
      )}

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

      {isClinician && (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Unpublish hides an uploaded guide from care partners and Care
          Companion so you can publish it again later. Remove permanently
          deletes the guide.
        </p>
      )}

      {currentUser?.role === 'CLINICIAN_MODERATOR' && (
        <AssistantGuidanceTester />
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

      {!loading && <Pagination label="Guides" {...guidePage} />}

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
          {guidePage.items.map((res) => (
            <GuideCard
              key={`${res.source || 'resource'}:${res.id}`}
              resource={res}
              staff={isClinician}
              busy={busyGuides.has(res.id)}
              onOpen={() => setActiveResource(res)}
              onEdit={() =>
                res.source === 'guide'
                  ? void guideAction(res, 'edit')
                  : openResourceForm(res)
              }
              onApprove={() => void guideAction(res, 'approve')}
              onToggle={() => void guideAction(res, 'toggle')}
              onDelete={() => setPendingDelete(res)}
            />
          ))}
        </div>
      )}

      <ResourceInspectorDialogs
        activeResource={activeResource}
        setActiveResource={setActiveResource}
        isClinician={isClinician}
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
