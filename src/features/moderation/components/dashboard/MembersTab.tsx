import { Search, X } from 'lucide-react';
import { AudienceBadge } from '@/shared/components/AudienceBadge';
import { Pagination } from '@/shared/components/Pagination';
import { getProperGroupName, type CommunityGroup, type GroupMember } from '@/types';

interface PaginationModel<T> {
  items: T[];
  page: number;
  pageCount: number;
  start: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
}

interface MembersTabProps {
  cohorts: CommunityGroup[];
  filteredMembers: GroupMember[];
  selectedCohortFilter: string;
  searchMemberQuery: string;
  loadingMembers: boolean;
  pagination: PaginationModel<GroupMember>;
  onCohortFilterChange: (cohortId: string) => void;
  onSearchChange: (query: string) => void;
  onReassign: (member: GroupMember) => void;
}

export function MembersTab({
  cohorts,
  filteredMembers,
  selectedCohortFilter,
  searchMemberQuery,
  loadingMembers,
  pagination,
  onCohortFilterChange,
  onSearchChange,
  onReassign,
}: MembersTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Caregiver Members ({filteredMembers.length})
              </h2>
              {selectedCohortFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-300 border border-blue-100 dark:border-blue-900/60 text-xs font-medium flex items-center gap-1">
                  <span>Group: {getProperGroupName(cohorts.find((cohort) => cohort.id === selectedCohortFilter))}</span>
                  <button
                    onClick={() => onCohortFilterChange('all')}
                    className="hover:text-rose-600 dark:hover:text-rose-400 p-0.5 ml-0.5 cursor-pointer"
                    title="Clear group filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verified care partners enrolled across Johns Hopkins cohorts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchMemberQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by name, handle, or contact..."
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
              />
            </div>

            <select
              value={selectedCohortFilter}
              onChange={(event) => onCohortFilterChange(event.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">All Groups</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {getProperGroupName(cohort)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingMembers ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
            Loading members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-slate-500 dark:text-slate-400 text-xs">No members found matching your search or filter.</p>
            {selectedCohortFilter !== 'all' && (
              <button
                onClick={() => onCohortFilterChange('all')}
                className="text-xs text-[#002D72] dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Clear group filter and show all
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs whitespace-nowrap">
                  <th className="py-2.5 px-3">Caregiver</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Assigned Group</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {pagination.items.map((member) => (
                  <tr key={member.userId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">{member.realName}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{member.anonymousHandle}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {member.phone ? (
                        <a href={`tel:${member.phone.replace(/[^\d+]/g, '')}`} className="text-[#002D72] dark:text-blue-400 hover:underline font-medium">
                          {member.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">No phone on file</span>
                      )}
                      <div>
                        <a href={`mailto:${member.email}`} className="text-xs text-[#002D72] dark:text-blue-400 hover:underline">
                          {member.email}
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <AudienceBadge condition={member.condition} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/60">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onReassign(member)}
                        className="px-2.5 py-1 text-xs text-[#002D72] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold transition cursor-pointer"
                      >
                        Move group
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loadingMembers && <Pagination label="Members" {...pagination} />}
    </div>
  );
}
