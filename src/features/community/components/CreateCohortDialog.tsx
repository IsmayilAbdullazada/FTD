import type { Dispatch, FormEventHandler, SetStateAction } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

interface CreateCohortDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  name: string;
  onNameChange: Dispatch<SetStateAction<string>>;
  region: string;
  onRegionChange: Dispatch<SetStateAction<string>>;
  description: string;
  onDescriptionChange: Dispatch<SetStateAction<string>>;
  submitting: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function CreateCohortDialog({
  open: showCreateGroupModal,
  onOpenChange: setShowCreateGroupModal,
  name: newGroupName,
  onNameChange: setNewGroupName,
  region: newGroupRegion,
  onRegionChange: setNewGroupRegion,
  description: newGroupDescription,
  onDescriptionChange: setNewGroupDescription,
  submitting: isSubmittingGroup,
  onSubmit: handleCreateGroup,
}: CreateCohortDialogProps) {
  const dialogRef = useDialogFocus(showCreateGroupModal);
  return (
    <>
      {/* MODAL: CREATE GROUP */}
      {showCreateGroupModal && (
        <div
          onClick={() => setShowCreateGroupModal(false)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Create a group"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden cursor-default transition-colors"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Create a Group
              </h3>
              <button
                type="button"
                aria-label="Close create group dialog"
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Group name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Annapolis Area"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location or County
                </label>
                <input
                  type="text"
                  value={newGroupRegion}
                  onChange={(e) => setNewGroupRegion(e.target.value)}
                  placeholder="e.g. Anne Arundel County"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Local peer support for families in this area."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGroup || !newGroupName.trim()}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
                >
                  {isSubmittingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}

