import type { Dispatch, SetStateAction } from 'react';
import { getProperGroupName, type CommunityGroup, type GroupMember } from '@/types';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

interface ReassignMemberDialogProps {
  member: GroupMember | null;
  onMemberChange: Dispatch<SetStateAction<GroupMember | null>>;
  targetGroupId: string;
  onTargetGroupChange: Dispatch<SetStateAction<string>>;
  cohorts: CommunityGroup[];
  onConfirm: () => void;
}

export function ReassignMemberDialog({
  member: reassigningUser,
  onMemberChange: setReassigningUser,
  targetGroupId: targetNewGroupId,
  onTargetGroupChange: setTargetNewGroupId,
  cohorts,
  onConfirm: handleConfirmReassign,
}: ReassignMemberDialogProps) {
  const dialogRef = useDialogFocus(Boolean(reassigningUser));
  return (
    <>
      {/* MODAL: REASSIGN MEMBER */}
      {reassigningUser && (
        <div
          onClick={() => setReassigningUser(null)}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Move member to another group"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-4 space-y-4 cursor-default transition-colors"
          >
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                Move Member to Another Group
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Moving <strong className="text-slate-800 dark:text-slate-200">{reassigningUser.realName}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Group
              </label>
              <select
                value={targetNewGroupId}
                onChange={(e) => setTargetNewGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 cursor-pointer"
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                    {getProperGroupName(c)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReassigningUser(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassign}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

