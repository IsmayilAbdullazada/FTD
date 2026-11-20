import { getProperGroupName } from '@/types';
import {
  ChevronDown,
  Lock,
  LockOpen,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';

import type {
  CarePartnerFeedProps,
  useCarePartnerFeed,
} from '../hooks/useCarePartnerFeed';

type Props = Pick<
  ReturnType<typeof useCarePartnerFeed>,
  | 'posts'
  | 'viewSection'
  | 'selectedGroupTab'
  | 'setSelectedGroupTab'
  | 'selectedStatusFilter'
  | 'setSelectedStatusFilter'
  | 'searchQuery'
  | 'setSearchQuery'
  | 'setCurrentPage'
  | 'isStaff'
  | 'selectedCondition'
  | 'setSelectedCondition'
  | 'isFilterMenuOpen'
  | 'setIsFilterMenuOpen'
  | 'filterPopoverRef'
> &
  Pick<CarePartnerFeedProps, 'cohorts'>;

export function FeedFilters({
  viewSection,
  selectedGroupTab,
  setSelectedGroupTab,
  selectedStatusFilter,
  setSelectedStatusFilter,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  isStaff,
  selectedCondition,
  setSelectedCondition,
  isFilterMenuOpen,
  setIsFilterMenuOpen,
  filterPopoverRef,
  cohorts,
}: Props) {
  return (
    <>
      {/* SEARCH AND UNIFIED FILTER BAR */}
      <div className="space-y-2.5 pb-2 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={
                viewSection === 'my-posts'
                  ? 'Search your posts by title or keyword...'
                  : 'Search discussions by topic, symptoms, or keyword...'
              }
              className="w-full pl-9.5 pr-8 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Unified Filter Button & Popover */}
          <div className="relative shrink-0" ref={filterPopoverRef}>
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen((prev) => !prev)}
              className={`min-h-11 px-3.5 py-2.5 rounded-xl border text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 ${
                selectedGroupTab !== 'all' ||
                selectedStatusFilter !== 'all' ||
                (isStaff && selectedCondition !== 'all')
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-[#002D72] dark:border-blue-500 text-[#002D72] dark:text-blue-300'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              aria-label="Filter discussions"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span>Filters</span>
              {(selectedGroupTab !== 'all' ||
                selectedStatusFilter !== 'all' ||
                (isStaff && selectedCondition !== 'all')) && (
                <span className="w-5 h-5 rounded-full bg-[#002D72] dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {(selectedGroupTab !== 'all' ? 1 : 0) +
                    (selectedStatusFilter !== 'all' ? 1 : 0) +
                    (isStaff && selectedCondition !== 'all' ? 1 : 0)}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Filter Popover Dropdown */}
            {isFilterMenuOpen && (
              <div className="absolute right-0 top-full mt-2 z-40 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 animate-in fade-in zoom-in-95 text-slate-800 dark:text-slate-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    <SlidersHorizontal className="w-4 h-4 text-[#002D72] dark:text-blue-400" />
                    <span>Filter Discussions</span>
                  </div>
                  {(selectedGroupTab !== 'all' ||
                    selectedStatusFilter !== 'all' ||
                    (isStaff && selectedCondition !== 'all')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGroupTab('all');
                        setSelectedStatusFilter('all');
                        if (isStaff) setSelectedCondition('all');
                        setCurrentPage(1);
                      }}
                      className="text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Filter 1: Community Group */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Community Group
                  </label>
                  <select
                    value={selectedGroupTab}
                    onChange={(e) => {
                      setSelectedGroupTab(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3.5 py-2.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 transition cursor-pointer min-h-11"
                  >
                    <option value="all">All Groups</option>
                    {cohorts.map((cohort) => (
                      <option key={cohort.id} value={cohort.id}>
                        {getProperGroupName(cohort)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter 2: Condition (Staff Only) */}
                {isStaff && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Condition
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      {(['all', 'FTD', 'AD'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSelectedCondition(opt);
                            setCurrentPage(1);
                          }}
                          className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] ${
                            selectedCondition === opt
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {opt === 'all' ? 'All' : opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter 3: Discussion Status */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Discussion Status
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('all');
                        setCurrentPage(1);
                      }}
                      className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] ${
                        selectedStatusFilter === 'all'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>All</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('open');
                        setCurrentPage(1);
                      }}
                      className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                        selectedStatusFilter === 'open'
                          ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatusFilter('closed');
                        setCurrentPage(1);
                      }}
                      className={`min-h-11 py-2.5 px-3 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 ${
                        selectedStatusFilter === 'closed'
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Closed</span>
                    </button>
                  </div>
                </div>

                {/* Popover Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsFilterMenuOpen(false)}
                    className="min-h-11 px-5 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {(selectedGroupTab !== 'all' ||
          selectedStatusFilter !== 'all' ||
          (isStaff && selectedCondition !== 'all') ||
          searchQuery) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-1">
              Active filters:
            </span>

            {/* Group chip */}
            {selectedGroupTab !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  Group:{' '}
                  {getProperGroupName(
                    cohorts.find((c) => c.id === selectedGroupTab),
                  ) || 'Selected Group'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroupTab('all');
                    setCurrentPage(1);
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                  aria-label="Remove group filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Status chip */}
            {selectedStatusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                {selectedStatusFilter === 'closed' ? (
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <LockOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  Status:{' '}
                  {selectedStatusFilter === 'closed'
                    ? 'Closed Only'
                    : 'Open Only'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                  aria-label="Remove status filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Search query chip */}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[150px]">"{searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                  aria-label="Remove search filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Condition chip (Staff only) */}
            {isStaff && selectedCondition !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                <span>Condition: {selectedCondition}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCondition('all');
                    setCurrentPage(1);
                  }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white rounded-full cursor-pointer ml-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
                  aria-label="Remove condition filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Clear all button */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGroupTab('all');
                setSelectedStatusFilter('all');
                if (isStaff) setSelectedCondition('all');
                setCurrentPage(1);
              }}
              className="text-sm text-[#002D72] dark:text-blue-400 hover:underline font-semibold ml-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#002D72]"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
}
