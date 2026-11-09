import { Lock, LockOpen, Search, Shield, Sparkles } from 'lucide-react';
import { AudienceBadge } from '@/shared/components/AudienceBadge';
import { Pagination } from '@/shared/components/Pagination';
import { getProperGroupName, type Post } from '@/types';

interface PaginationModel<T> {
  items: T[];
  page: number;
  pageCount: number;
  start: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
}

type PolicyFilter = 'all' | 'moderated' | 'unmoderated' | 'closed';

interface DiscussionsTabProps {
  publishedPosts: Post[];
  filteredDiscussions: Post[];
  loadingPosts: boolean;
  searchPostsQuery: string;
  postsPolicyFilter: PolicyFilter;
  discussionPage: PaginationModel<Post>;
  setSearchPostsQuery: (query: string) => void;
  setPostsPolicyFilter: (filter: PolicyFilter) => void;
  setPostToClose: (post: Post) => void;
  handleTogglePostRepliesMode: (post: Post) => Promise<void>;
  handleTogglePostClose: (post: Post) => Promise<void>;
  onOpenDiscussion?: (postId: string) => void;
}

export function DiscussionsTab({
  publishedPosts,
  filteredDiscussions,
  loadingPosts,
  searchPostsQuery,
  postsPolicyFilter,
  discussionPage,
  setSearchPostsQuery,
  setPostsPolicyFilter,
  setPostToClose,
  handleTogglePostRepliesMode,
  handleTogglePostClose,
  onOpenDiscussion,
}: DiscussionsTabProps) {
  return (
        <div className="space-y-3.5 sm:space-y-4">
          {/* Header Description Card */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Discussions & Reply Policies
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {publishedPosts.length} published
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Manage reply moderation mode for discussions one by one. By default, all replies to posts are moderated. Turn on unmoderated mode to allow everyone to reply immediately, with moderator removal controls.
            </p>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="space-y-2">
            {/* Filter by Policy: Dedicated full-width bar with smooth horizontal scroll safety */}
            <div className="w-full overflow-x-auto no-scrollbar py-0.5">
              <div className="inline-flex w-full min-w-full sm:w-auto sm:min-w-0 items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('all')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">({publishedPosts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('moderated')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'moderated'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Moderated</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">
                    ({publishedPosts.filter((p) => !p.allowUnmoderatedReplies && !p.isClosed).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('unmoderated')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'unmoderated'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Unmoderated</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">
                    ({publishedPosts.filter((p) => p.allowUnmoderatedReplies && !p.isClosed).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostsPolicyFilter('closed')}
                  className={`flex-1 sm:flex-initial py-1.5 px-2 sm:px-3 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                    postsPolicyFilter === 'closed'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Closed</span>
                  <span className="text-[10px] sm:text-[11px] opacity-75 tabular-nums">
                    ({publishedPosts.filter((p) => p.isClosed).length})
                  </span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchPostsQuery}
                onChange={(e) => setSearchPostsQuery(e.target.value)}
                placeholder="Search discussions by title, author handle, or keywords..."
                className="w-full pl-8.5 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500"
              />
            </div>
          </div>

          {/* List of discussions */}
          {loadingPosts ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
              Loading discussions...
            </div>
          ) : (
            (() => {
              const filtered = filteredDiscussions;

              if (filtered.length === 0) {
                return (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 dark:text-slate-500 text-xs space-y-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No discussions match filter.</p>
                    <p>Try modifying your search or policy filter above.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {discussionPage.items.map((post) => {
                    const isUnmoderated = post.allowUnmoderatedReplies === true;
                    const groupName = getProperGroupName(post.assignedGroups[0]);

                    return (
                      <div
                        key={post.id}
                        onClick={() => onOpenDiscussion?.(post.id)}
                        className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all hover:border-[#002D72]/40 dark:hover:border-blue-500/50 hover:shadow-xs cursor-pointer"
                      >
                        <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                              {post.author.anonymousHandle}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] truncate">
                              {groupName}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <AudienceBadge condition={post.condition} />
                            <span className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-[11px]">
                              {post.commentCount} {post.commentCount === 1 ? 'reply' : 'replies'}
                            </span>
                          </div>

                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#002D72] dark:group-hover:text-blue-400 text-xs sm:text-sm leading-snug transition-colors">
                            {post.title}
                          </h3>

                          <p className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs line-clamp-2 leading-relaxed">
                            {post.content}
                          </p>

                          {/* Status Badge */}
                          <div className="pt-0.5 sm:pt-1 flex flex-wrap items-center gap-2 text-xs">
                            {post.isClosed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-200/90 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600 dark:text-slate-400" />
                                <span>Discussion Closed</span>
                              </span>
                            ) : isUnmoderated ? (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Unmoderated</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Moderated</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions for this post: Toggle Allow open replies and Button below it for closing/reopening */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 flex flex-col items-stretch sm:items-end gap-1.5 sm:gap-2 w-full sm:w-auto"
                        >
                          <div
                            className={`inline-flex items-center justify-between sm:justify-start gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all ${
                              post.isClosed ? 'opacity-60' : ''
                            }`}
                          >
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto ${
                                post.isClosed ? 'cursor-not-allowed' : 'cursor-pointer'
                              } select-none`}
                            >
                              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                Allow open replies
                              </span>
                              <div className="relative inline-flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isUnmoderated}
                                  disabled={post.isClosed}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleTogglePostRepliesMode(post);
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4.5 sm:w-9 sm:h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 sm:after:h-4 sm:after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                              </div>
                            </label>
                          </div>

                          {/* Button below Allow open replies: Close Discussion / Reopen Discussion */}
                          {post.isClosed ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePostClose(post);
                              }}
                              className="w-full sm:w-auto px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                              title="Reopen discussion to allow new replies"
                            >
                              <LockOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Reopen Discussion</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostToClose(post);
                              }}
                              className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                              title="Close discussion to prevent new replies while preserving existing comments"
                            >
                              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400" />
                              <span>Close Discussion</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
          {!loadingPosts && <Pagination label="Discussions" {...discussionPage} />}
        </div>
  );
}


