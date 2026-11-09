import { CheckCircle, MessageSquare, Plus, UserPlus, X } from 'lucide-react';
import type { Condition } from '@/types';

interface DashboardHeaderProps {
  audienceFilter: 'all' | Condition;
  actionSuccessNotice: string | null;
  onAudienceFilterChange: (filter: 'all' | Condition) => void;
  onCreatePost: () => void;
  onCreateCohort: () => void;
  onOpenInvite: () => void;
  onOpenAudit: () => void;
  onDismissNotice: () => void;
}

export function DashboardHeader({
  audienceFilter,
  actionSuccessNotice,
  onAudienceFilterChange,
  onCreatePost,
  onCreateCohort,
  onOpenInvite,
  onOpenAudit,
  onDismissNotice,
}: DashboardHeaderProps) {
  return (
    <>
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pb-3.5 sm:pb-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={onCreatePost}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>New Post</span>
          </button>

          <button
            onClick={onCreateCohort}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>New Group</span>
          </button>

          <button
            onClick={onOpenInvite}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-xs whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400" />
            <span>Invite Member</span>
          </button>

          <button
            onClick={onOpenAudit}
            className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition whitespace-nowrap cursor-pointer"
          >
            Activity Log
          </button>
        </div>
      </div>

      {actionSuccessNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm px-3.5 py-2 sm:py-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{actionSuccessNotice}</span>
          </div>
          <button onClick={onDismissNotice} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      { /* Viewing Filter */ }
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-600 dark:text-slate-400">Viewing:</span>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg font-semibold">
          {(['all', 'FTD', 'AD'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onAudienceFilterChange(opt)}
              className={`px-2.5 sm:px-3 py-1 rounded-md transition cursor-pointer text-xs ${
                audienceFilter === opt
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {opt === 'all' ? 'All' : opt}
            </button>
          ))}
        </div>
      </div>

    </>
  );
}

