import type { KeyboardEvent } from 'react';
import { FileText, Layers, MessageSquare, Shield, Users } from 'lucide-react';
import type { ClinicianDashboardTab } from '@/features/clinician-workspace/types';

interface DashboardNavigationProps {
  activeTab: ClinicianDashboardTab;
  pendingCount: number;
  discussionCount: number;
  activeGuideCount: number;
  guideCount: number;
  cohortCount: number;
  memberCount: number;
  onTabChange: (tab: ClinicianDashboardTab) => void;
}

export function DashboardNavigation({
  activeTab,
  pendingCount,
  discussionCount,
  activeGuideCount,
  guideCount,
  cohortCount,
  memberCount,
  onTabChange,
}: DashboardNavigationProps) {
  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    tab: ClinicianDashboardTab
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTabChange(tab);
    }
  };

  return (
    <>
      {/* 5 STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <div
          onClick={() => onTabChange('queue')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => handleCardKeyDown(event, 'queue')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-1 ring-amber-300 dark:ring-amber-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Pending</span>
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{pendingCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {pendingCount === 1 ? 'review' : 'review'}
            </span>
          </div>
        </div>

        <div
          onClick={() => onTabChange('discussions')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => handleCardKeyDown(event, 'discussions')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'discussions'
              ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-300 dark:ring-indigo-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Discussions</span>
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{discussionCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">posts</span>
          </div>
        </div>

        <div
          onClick={() => onTabChange('chatbot-knowledge')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => handleCardKeyDown(event, 'chatbot-knowledge')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'chatbot-knowledge'
              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-1 ring-blue-300 dark:ring-blue-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Guides</span>
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#002D72] dark:text-blue-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {activeGuideCount}
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
              active
            </span>
          </div>
        </div>

        <div
          onClick={() => onTabChange('cohorts')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => handleCardKeyDown(event, 'cohorts')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'cohorts'
              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 ring-1 ring-blue-300 dark:ring-blue-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Groups</span>
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#002D72] dark:text-blue-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{cohortCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">regions</span>
          </div>
        </div>

        <div
          onClick={() => onTabChange('members')}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => handleCardKeyDown(event, 'members')}
          className={`p-2.5 sm:p-3.5 lg:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer ${
            activeTab === 'members'
              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-300 dark:ring-emerald-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Members</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{memberCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">caregivers</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar flex-nowrap">
          <button
            onClick={() => onTabChange('queue')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'queue'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Pending Posts & Replies</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-amber-500 text-white text-[10px] sm:text-xs font-bold tabular-nums">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('discussions')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'discussions'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Discussions</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {discussionCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('chatbot-knowledge')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'chatbot-knowledge'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Guides</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {guideCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('cohorts')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'cohorts'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Groups</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {cohortCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('members')}
            className={`pb-2.5 sm:pb-3 flex items-center gap-1.5 sm:gap-2 border-b-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'members'
                ? 'border-[#002D72] dark:border-blue-400 text-[#002D72] dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Members</span>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-bold tabular-nums">
              {memberCount}
            </span>
          </button>
        </div>
      </div>

    </>
  );
}

