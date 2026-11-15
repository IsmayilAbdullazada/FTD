import { AudienceBadge } from "@/shared/components/AudienceBadge";
import { getProperGroupName } from "@/types";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import type {
  CarePartnerFeedProps,
  useCarePartnerFeed,
} from "../hooks/useCarePartnerFeed";

type Props = Pick<
  ReturnType<typeof useCarePartnerFeed>,
  | "posts"
  | "loading"
  | "viewSection"
  | "selectedStatusFilter"
  | "setSelectedStatusFilter"
  | "searchQuery"
  | "setSearchQuery"
  | "currentPage"
  | "setCurrentPage"
  | "POSTS_PER_PAGE"
  | "likedPosts"
  | "isStaff"
  | "setConfirmDeletePost"
  | "carePartnerReplyText"
  | "setCarePartnerReplyText"
  | "isSendingCareReply"
  | "careReplyExpanded"
  | "setCareReplyExpanded"
  | "handleOpenDiscussion"
  | "handleToggleLike"
  | "handleStartEdit"
  | "handleSendPrivateCareReply"
> &
  Pick<CarePartnerFeedProps, "currentUser" | "onOpenComposer">;

export function FeedPostList({
  posts,
  loading,
  viewSection,
  selectedStatusFilter,
  setSelectedStatusFilter,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  POSTS_PER_PAGE,
  likedPosts,
  isStaff,
  setConfirmDeletePost,
  carePartnerReplyText,
  setCarePartnerReplyText,
  isSendingCareReply,
  careReplyExpanded,
  setCareReplyExpanded,
  handleOpenDiscussion,
  handleToggleLike,
  handleStartEdit,
  handleSendPrivateCareReply,
  currentUser,
  onOpenComposer,
}: Props) {
  return (
    <>
      {/* Count & Reset Active Filters */}
      {(() => {
        // Filter by section (all community discussions vs my posts only), status, and search query
        const filteredPosts = posts.filter((post) => {
          if (viewSection === "my-posts") {
            const isMine =
              post.author.userId === currentUser.id ||
              post.author.anonymousHandle === currentUser.anonymousHandle ||
              (post.author as any).id === currentUser.id;
            if (!isMine) return false;
          } else {
            // Community Discussions MUST only show published, approved posts
            if (post.status !== "APPROVED") return false;
          }

          if (selectedStatusFilter === "open" && post.isClosed) return false;
          if (selectedStatusFilter === "closed" && !post.isClosed) return false;

          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const titleMatch = post.title.toLowerCase().includes(q);
            const contentMatch = post.content.toLowerCase().includes(q);
            const authorMatch = post.author.anonymousHandle
              .toLowerCase()
              .includes(q);
            const groupMatch = post.assignedGroups.some(
              (g) =>
                g.name.toLowerCase().includes(q) ||
                (g.geographicRegion &&
                  g.geographicRegion.toLowerCase().includes(q)),
            );
            if (!titleMatch && !contentMatch && !authorMatch && !groupMatch) {
              return false;
            }
          }

          return true;
        });

        // Sort logic: in My Posts, items Under Review (PENDING_MODERATION) MUST always be pinned to the top!
        const sortedPosts = [...filteredPosts].sort((a, b) => {
          if (viewSection === "my-posts") {
            const aPending = a.status === "PENDING_MODERATION";
            const bPending = b.status === "PENDING_MODERATION";
            if (aPending && !bPending) return -1;
            if (!aPending && bPending) return 1;
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        const totalFilteredCount = sortedPosts.length;
        const totalPages = Math.max(
          1,
          Math.ceil(totalFilteredCount / POSTS_PER_PAGE),
        );
        const validCurrentPage = Math.min(currentPage, totalPages);
        const startIndex = (validCurrentPage - 1) * POSTS_PER_PAGE;
        const paginatedPosts = sortedPosts.slice(
          startIndex,
          startIndex + POSTS_PER_PAGE,
        );

        return (
          <>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 px-0.5 font-medium">
              <span>
                {totalFilteredCount === 0
                  ? viewSection === "my-posts"
                    ? "0 posts found"
                    : "0 discussions found"
                  : `Showing ${startIndex + 1}–${Math.min(startIndex + POSTS_PER_PAGE, totalFilteredCount)} of ${totalFilteredCount} ${
                      viewSection === "my-posts" ? "posts" : "discussions"
                    }`}
              </span>
            </div>

            {/* POSTS LIST */}
            <div className="space-y-4 pt-1">
              {loading ? (
                <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-base font-sans">
                  Loading discussions...
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center text-slate-500 dark:text-slate-400 text-base space-y-3 shadow-xs">
                  <div className="font-serif font-semibold text-lg sm:text-xl text-slate-800 dark:text-slate-200">
                    {searchQuery
                      ? `No ${viewSection === "my-posts" ? "posts" : "discussions"} matching "${searchQuery}"`
                      : viewSection === "my-posts"
                        ? "You haven't submitted any posts yet."
                        : "No discussions found in this channel."}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                    {searchQuery
                      ? "Try adjusting your search terms or resetting filters."
                      : viewSection === "my-posts"
                        ? "When you share a question or care advice, your post will appear here with its real-time review status and any private responses from the moderator."
                        : "You can start the first conversation or check the Guides for guidance."}
                  </p>
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedStatusFilter("all");
                        setCurrentPage(1);
                      }}
                      className="text-[#002D72] dark:text-blue-400 font-semibold hover:underline text-sm inline-block pt-1 cursor-pointer"
                    >
                      Clear search
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenComposer}
                      className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {viewSection === "my-posts"
                          ? "Create a Post"
                          : "Start the first discussion"}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                paginatedPosts.map((post) => {
                  const isLiked =
                    likedPosts[post.id] !== undefined
                      ? likedPosts[post.id]
                      : Boolean(post.isUpvoted);
                  const currentLikes = post.upvotes;
                  const regionName = getProperGroupName(post.assignedGroups[0]);
                  const isAuthor =
                    currentUser.role === "CARE_PARTNER" &&
                    (post.author.userId === currentUser.id ||
                      post.author.anonymousHandle ===
                        currentUser.anonymousHandle);
                  const isPending =
                    post.status === "PENDING_MODERATION" && isAuthor;

                  return (
                    <article
                      key={post.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open discussion: ${post.title}`}
                      onClick={() => handleOpenDiscussion(post)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          if (
                            (e.target as HTMLElement).tagName === "BUTTON" ||
                            (e.target as HTMLElement).closest("button")
                          ) {
                            return;
                          }
                          e.preventDefault();
                          handleOpenDiscussion(post);
                        }
                      }}
                      className={`rounded-2xl border p-5 sm:p-6 space-y-3.5 transition-all cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                        isPending
                          ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-300 dark:hover:border-amber-700/80 shadow-2xs"
                          : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                      }`}
                    >
                      {/* Author Metadata & Closed Badge */}
                      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2 font-medium min-w-0">
                          <span className="text-slate-900 dark:text-slate-200 font-semibold truncate">
                            {post.author.anonymousHandle}
                          </span>
                          {regionName && (
                            <>
                              <span
                                aria-hidden="true"
                                className="text-slate-300 dark:text-slate-700 shrink-0"
                              >
                                ·
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 truncate">
                                {regionName}
                              </span>
                            </>
                          )}
                          {isStaff &&
                            post.condition &&
                            post.condition !== "BOTH" && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700 shrink-0"
                                >
                                  ·
                                </span>
                                <AudienceBadge condition={post.condition} />
                              </>
                            )}
                          {post.isClosed && (
                            <>
                              <span
                                aria-hidden="true"
                                className="text-slate-300 dark:text-slate-700 shrink-0"
                              >
                                ·
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                                <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>Closed</span>
                              </span>
                            </>
                          )}
                          {viewSection === "my-posts" && (
                            <>
                              <span
                                aria-hidden="true"
                                className="text-slate-300 dark:text-slate-700 shrink-0"
                              >
                                ·
                              </span>
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300/80 dark:border-amber-800/80 px-2.5 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  <span>Under Review</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Published</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-sm shrink-0 pl-2">
                          {new Date(post.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="font-serif text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-[#002D72] dark:group-hover:text-blue-400 group-focus-visible:text-[#002D72] dark:group-focus-visible:text-blue-400 transition">
                        {post.title}
                      </h2>

                      {/* Body Content Snippet */}
                      <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3">
                        {post.content}
                      </p>

                      {isPending && (
                        <div className="text-sm text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl p-3.5 border border-amber-200/80 dark:border-amber-900/60 leading-relaxed font-sans">
                          Your question was received and is currently under
                          review before being shared with the community.
                        </div>
                      )}

                      {/* Confidential Moderator Guidance Card */}
                      {post.moderatorPrivateNotes &&
                        post.moderatorPrivateNotes.length > 0 && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 space-y-3 cursor-default shadow-2xs"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-[#002D72] dark:text-blue-300">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Private Response from Moderator</span>
                              </div>
                              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300/60 dark:border-emerald-800">
                                Only visible to you
                              </span>
                            </div>

                            {/* Dialogue Messages */}
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {post.moderatorPrivateNotes.map((note) => {
                                const isFromCarePartner =
                                  note.senderRole !== "CLINICIAN_MODERATOR" &&
                                  note.senderName !== "Clinical Moderator" &&
                                  note.senderName !== "Moderator" &&
                                  note.senderId !== "user-clinician-1" &&
                                  note.senderId !== "user-admin-1" &&
                                  (note.senderRole === "CARE_PARTNER" ||
                                    note.senderId === post.author.userId ||
                                    note.senderId === currentUser.id);
                                return (
                                  <div
                                    key={note.id}
                                    className={`p-3 rounded-xl border text-xs sm:text-[13px] leading-relaxed ${
                                      isFromCarePartner
                                        ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 ml-4"
                                        : "bg-white dark:bg-slate-900 border-blue-200/80 dark:border-blue-900/60 text-slate-900 dark:text-slate-100 mr-2 shadow-2xs"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
                                      <span
                                        className={
                                          isFromCarePartner
                                            ? "text-amber-800 dark:text-amber-300 font-semibold"
                                            : "text-[#002D72] dark:text-blue-300 font-semibold"
                                        }
                                      >
                                        {isFromCarePartner
                                          ? "You (Care Partner)"
                                          : "Moderator"}
                                      </span>
                                      <span>
                                        {new Date(
                                          note.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                    <p className="whitespace-pre-line">
                                      {note.message}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reply directly back to moderator */}
                            <div className="pt-2 border-t border-blue-200/70 dark:border-blue-900/60">
                              {!careReplyExpanded[post.id] ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCareReplyExpanded((prev) => ({
                                      ...prev,
                                      [post.id]: true,
                                    }));
                                  }}
                                  className="text-xs font-semibold text-[#002D72] dark:text-blue-400 hover:underline flex items-center gap-1.5 cursor-pointer py-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Reply to Moderator</span>
                                </button>
                              ) : (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSendPrivateCareReply(post.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="space-y-2 pt-1"
                                >
                                  <textarea
                                    rows={2}
                                    value={carePartnerReplyText[post.id] || ""}
                                    onChange={(e) =>
                                      setCarePartnerReplyText((prev) => ({
                                        ...prev,
                                        [post.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Write your response to the moderator..."
                                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400"
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCareReplyExpanded((prev) => ({
                                          ...prev,
                                          [post.id]: false,
                                        }))
                                      }
                                      className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={
                                        !carePartnerReplyText[
                                          post.id
                                        ]?.trim() || isSendingCareReply[post.id]
                                      }
                                      className="px-3.5 py-1.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                    >
                                      {isSendingCareReply[post.id] ? (
                                        <span>Sending...</span>
                                      ) : (
                                        <>
                                          <Send className="w-3 h-3" />
                                          <span>Send Reply</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </form>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Actions Row */}
                      {isPending ? (
                        <div
                          className="pt-3 border-t border-amber-200/70 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-medium">
                            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                            <span>Under Review</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(post);
                              }}
                              className="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-amber-100/60 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold flex items-center gap-1.5 text-sm transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500"
                            >
                              <Pencil className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              <span>Edit Question</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeletePost(post);
                              }}
                              className="min-h-11 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl font-semibold flex items-center gap-1.5 text-sm transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              <span>Cancel Submission</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                            <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#002D72] dark:group-hover:text-blue-400" />
                            <span>
                              {post.commentCount}{" "}
                              {post.commentCount === 1 ? "reply" : "replies"}
                            </span>
                            {post.allowUnmoderatedReplies && !post.isClosed && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/40">
                                Open Replies
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleLike(e, post.id)}
                            className={`min-h-11 flex items-center gap-1.5 transition py-2 px-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 ${
                              isLiked
                                ? "text-rose-600 dark:text-rose-400 font-semibold"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${isLiked ? "fill-rose-600 dark:fill-rose-400" : ""}`}
                            />
                            <span>{currentLikes} helpful</span>
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })
              )}

              {/* PAGINATION CONTROLS (Responsive on all mobile and tablet viewports) */}
              {!loading && totalPages > 1 && (
                <nav
                  role="navigation"
                  aria-label="Discussions pagination"
                  className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 max-w-full overflow-hidden"
                >
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={validCurrentPage === 1}
                    aria-label="Previous Page"
                    className="min-h-11 px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden inline">Prev</span>
                  </button>

                  {/* Mobile Compact Page Indicator (< sm) */}
                  <div className="flex sm:hidden items-center justify-center px-2 text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums select-none">
                    Page {validCurrentPage} of {totalPages}
                  </div>

                  {/* Desktop & Tablet Page Number Buttons (>= sm) */}
                  <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          aria-label={`Go to page ${page}`}
                          aria-current={
                            validCurrentPage === page ? "page" : undefined
                          }
                          className={`min-w-11 h-11 px-3 text-sm font-semibold rounded-xl transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 ${
                            validCurrentPage === page
                              ? "bg-[#002D72] dark:bg-blue-600 text-white shadow-2xs font-bold"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={validCurrentPage === totalPages}
                    aria-label="Next Page"
                    className="min-h-11 px-3 sm:px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72] dark:focus-visible:ring-blue-500 shrink-0"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden inline">Next</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                </nav>
              )}
            </div>
          </>
        );
      })()}
    </>
  );
}
