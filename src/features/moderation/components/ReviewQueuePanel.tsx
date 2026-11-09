import {
  AlertTriangle,
  Check,
  MapPin,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { AudienceBadge } from '@/shared/components/AudienceBadge';
import { Pagination } from '@/shared/components/Pagination';
import {
  getFullGroupName,
  getProperGroupName,
  type Audience,
  type CommunityGroup,
  type QueueItem,
} from '@/types';

interface PaginationModel<T> {
  items: T[];
  page: number;
  pageCount: number;
  start: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
}

interface ReviewQueuePanelProps {
  queueItems: QueueItem[];
  loadingQueue: boolean;
  selectedIndex: number;
  activeItem: QueueItem | null;
  queuePage: PaginationModel<QueueItem>;
  cohorts: CommunityGroup[];
  approveAudience: Audience;
  sanitizedDraft: string;
  selectedGroupIds: string[];
  allowUnmoderatedReplies: boolean;
  onRefresh: () => void;
  onSelectItem: (index: number) => void;
  onQueuePageChange: (page: number) => void;
  onApproveAudienceChange: (audience: Audience) => void;
  onSanitizedDraftChange: (content: string) => void;
  onSelectedGroupIdsChange: (groupIds: string[]) => void;
  onAllowUnmoderatedRepliesChange: (allow: boolean) => void;
  onCleanPersonalInfo: () => void;
  onPublish: () => void;
  onOpenPrivateReply: () => void;
  onOpenReject: () => void;
}

export function ReviewQueuePanel({
  queueItems,
  loadingQueue,
  selectedIndex,
  activeItem,
  queuePage,
  cohorts,
  approveAudience,
  sanitizedDraft,
  selectedGroupIds,
  allowUnmoderatedReplies,
  onRefresh,
  onSelectItem: handleSelectItem,
  onQueuePageChange: changeQueuePage,
  onApproveAudienceChange: setApproveAudience,
  onSanitizedDraftChange: setSanitizedDraft,
  onSelectedGroupIdsChange: setSelectedGroupIds,
  onAllowUnmoderatedRepliesChange: setAllowUnmoderatedReplies,
  onCleanPersonalInfo: handleCleanPersonalInfo,
  onPublish: handlePublish,
  onOpenPrivateReply,
  onOpenReject,
}: ReviewQueuePanelProps) {
  return (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Submissions to review ({queueItems.length})</h2>
            <button type="button" aria-label="Refresh queue" title="Refresh queue" disabled={loadingQueue}
              onClick={onRefresh}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#002D72] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <RefreshCw aria-hidden="true" className={`w-4 h-4 ${loadingQueue ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loadingQueue ? (
            <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-xs">
              Loading submissions...
            </div>
          ) : queueItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 transition-colors">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                No submissions waiting
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                There are no questions or replies awaiting review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Post list */}
              <div className="lg:col-span-4 space-y-2">
                <div className="space-y-2 p-1">
                  {queuePage.items.map((item, pageIndex) => {
                    const idx = queuePage.start + pageIndex;
                    const isSelected = idx === selectedIndex;
                    const hasPhi = item.phiAlerts && item.phiAlerts.length > 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(idx)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition space-y-1.5 ${
                          isSelected
                            ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#002D72] dark:border-blue-500 ring-1 ring-[#002D72] dark:ring-blue-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.author.realName}
                          </span>
                        </div>

                        <span className="inline-flex rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.type === 'POST' ? 'Question' : item.parentCommentId ? 'Nested reply' : 'Reply to question'}
                        </span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {item.title}
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px] leading-relaxed">
                          {item.rawContent}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span>{item.author.anonymousHandle}</span>
                            <AudienceBadge condition={item.condition} />
                          </span>
                          {hasPhi && (
                            <span className="text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 font-medium px-1.5 py-0.5 rounded text-[10px]">
                              Personal info found
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Pagination label="Queue" {...queuePage} setPage={changeQueuePage} />
              </div>

              {/* Right Column: Review details */}
              {activeItem && (
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 transition-colors">
                  {/* Author Banner */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {activeItem.author.realName}{' '}
                        <span className="font-normal text-slate-500 dark:text-slate-400 text-xs">
                          (Shown as: {activeItem.author.anonymousHandle})
                        </span>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>Phone: {activeItem.author.phone
                          ? <a href={`tel:${activeItem.author.phone.replace(/[^\d+]/g, '')}`} className="text-[#002D72] dark:text-blue-400 hover:underline">{activeItem.author.phone}</a>
                          : 'none'}</span>
                        <span>•</span>
                        <span>Email: <a href={`mailto:${activeItem.author.email}`} className="text-[#002D72] dark:text-blue-400 hover:underline">{activeItem.author.email}</a></span>
                      </div>
                    </div>
                    {activeItem.suggestedCohort && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{getFullGroupName(activeItem.suggestedCohort)}</span>
                      </div>
                    )}
                  </div>

                  {activeItem.type === 'COMMENT' && (
                    <div className="space-y-2 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 text-sm">
                      <p className="font-semibold text-[#002D72] dark:text-sky-400">{activeItem.parentCommentId ? 'Review nested reply' : 'Review reply to question'}</p>
                      <a href={`/?tab=feed&post=${encodeURIComponent(activeItem.postId || '')}`} className="font-semibold hover:underline">{activeItem.title}</a>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{activeItem.postContent}</p>
                      {activeItem.parentCommentId && <div className="border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                        <p className="text-xs font-semibold text-slate-500">Replying to</p>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{activeItem.parentContent || 'This parent reply is no longer available.'}</p>
                      </div>}
                      <p className="text-xs text-slate-500">Published replies keep the discussion’s groups, audience, and thread position.</p>
                    </div>
                  )}
                  {/* Original Question */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {activeItem.type === 'COMMENT' ? 'Submitted reply' : 'Original post'}
                    </label>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-750 space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">
                        {activeItem.title}
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                        {activeItem.rawContent}
                      </p>
                    </div>

                    {/* Personal info alert */}
                    {activeItem.phiAlerts && activeItem.phiAlerts.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                            <span>Personal details detected ({activeItem.phiAlerts.length})</span>
                          </span>
                          <button
                            onClick={handleCleanPersonalInfo}
                            className="text-xs text-[#002D72] dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Remove personal info</span>
                          </button>
                        </div>
                        <ul className="text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                          {activeItem.phiAlerts.map((alertItem, i) => (
                            <li key={i}>
                              • Found "{alertItem.text}" ({alertItem.type}) — {alertItem.explanation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Public Text to Publish */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        {activeItem.type === 'COMMENT' ? 'Public reply text' : 'Public post text'}
                      </label>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Community will see this text
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={sanitizedDraft}
                      onChange={(e) => setSanitizedDraft(e.target.value)}
                      className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 leading-relaxed"
                    />
                  </div>

                  {activeItem.type === 'POST' && (<>
                  {/* Group */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Group
                    </label>
                    <select
                      value={selectedGroupIds[0] || cohorts[0]?.id}
                      onChange={(e) => setSelectedGroupIds([e.target.value])}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 cursor-pointer"
                    >
                      {cohorts.map((cohort) => (
                        <option key={cohort.id} value={cohort.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          {getProperGroupName(cohort)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  { /* Approve-As Selector */ }
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Who can see this post</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([['FTD', 'FTD only'], ['AD', 'AD only'], ['BOTH', 'Both groups']] as [Audience, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setApproveAudience(value)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                            approveAudience === value
                              ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {approveAudience !== (activeItem.condition ?? 'FTD') && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Changed from the author's group ({activeItem.condition ?? 'FTD'}).
                      </p>
                    )}
                  </div>

                  {/* Reply Moderation Policy Toggle */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-750">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pr-2">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Allow everyone to reply without moderation</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={allowUnmoderatedReplies}
                          onChange={(e) => setAllowUnmoderatedReplies(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                  </>)}

                  {/* Existing Private Notes History */}
                  {activeItem.moderatorPrivateNotes && activeItem.moderatorPrivateNotes.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#002D72] dark:text-sky-300">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <span>Private Clinical Dialogue ({activeItem.moderatorPrivateNotes.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">Private to author only</span>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {activeItem.moderatorPrivateNotes.map((note) => {
                          const isFromModerator =
                            note.senderRole === 'CLINICIAN_MODERATOR' ||
                            note.senderId === 'user-clinician-1' ||
                            note.senderId === 'user-admin-1' ||
                            note.senderName === 'Clinical Moderator' ||
                            (Boolean(note.senderId) && note.senderId !== activeItem.author.userId);

                          return (
                            <div
                              key={note.id}
                              className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                                isFromModerator
                                  ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/60'
                                  : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span
                                  className={`font-semibold ${
                                    isFromModerator
                                      ? 'text-[#002D72] dark:text-blue-300'
                                      : 'text-amber-800 dark:text-amber-300'
                                  }`}
                                >
                                  {isFromModerator
                                    ? 'Clinical Moderator (You)'
                                    : `${note.senderName && note.senderName !== 'Clinical Moderator' ? note.senderName : activeItem.author.realName} (Care Partner)`}
                                </span>
                                <span>
                                  {new Date(note.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                                {note.message}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handlePublish}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Publish</span>
                    </button>

                    {activeItem.type === 'POST' && (
                    <button
                      type="button"
                      onClick={onOpenPrivateReply}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-[#002D72] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4 text-[#002D72] dark:text-blue-400" />
                      <span>Reply Privately</span>
                    </button>
                    )}

                    <button
                      onClick={onOpenReject}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
  );
}

