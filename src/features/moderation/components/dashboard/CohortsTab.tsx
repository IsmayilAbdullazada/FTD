import { ArrowRight, MapPin, Plus } from 'lucide-react';
import { Pagination } from '@/shared/components/Pagination';
import { getFullGroupName, getProperGroupName, type CommunityGroup, type GroupMember } from '@/types';

interface PaginationModel<T> {
  items: T[];
  page: number;
  pageCount: number;
  start: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
}

interface CohortsTabProps {
  cohorts: CommunityGroup[];
  members: GroupMember[];
  pagination: PaginationModel<CommunityGroup>;
  onCreateGroup: () => void;
  onSelectCohort: (cohortId: string) => void;
}

export function CohortsTab({
  cohorts,
  members,
  pagination,
  onCreateGroup,
  onSelectCohort,
}: CohortsTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Community Groups
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Regional and clinic-wide support cohorts. Click any group card to view its enrolled members.
          </p>
        </div>

        <button
          onClick={onCreateGroup}
          className="px-3.5 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Group</span>
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">All Groups ({cohorts.length})</span>
          <span className="text-slate-400 dark:text-slate-500">Click a card to filter members</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {pagination.items.map((cohort) => {
            const assignedCount = members.filter((member) => member.primaryGroupId === cohort.id).length;
            return (
              <div
                key={cohort.id}
                onClick={() => onSelectCohort(cohort.id)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3.5 flex flex-col justify-between cursor-pointer group hover:border-[#002D72] dark:hover:border-blue-500 hover:shadow-xs transition-all text-left"
                role="button"
                tabIndex={0}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif font-semibold text-slate-900 dark:text-white text-base group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                      {getProperGroupName(cohort)}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {assignedCount} {assignedCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">{getFullGroupName(cohort)}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                    {cohort.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400 group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                  <span className="text-xs text-slate-400 dark:text-slate-500">Click to view members</span>
                  <span className="font-semibold text-xs flex items-center gap-1">
                    <span>View members</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Pagination label="Groups" {...pagination} />
    </div>
  );
}
