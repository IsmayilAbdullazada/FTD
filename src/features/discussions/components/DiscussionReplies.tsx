import {
  buildCommentTree,
  type CommentNode,
} from "@/features/discussions/lib/commentTree";
import {
  AlertCircle,
  Clock,
  Lock,
  MessageSquare,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import React from "react";

import {
  useDiscussionDetail,
  type DiscussionDetailProps,
} from "../hooks/useDiscussionDetail";

type Props = Pick<
  ReturnType<typeof useDiscussionDetail>,
  | "post"
  | "comments"
  | "loadingComments"
  | "replyText"
  | "setReplyText"
  | "replyTarget"
  | "setReplyTarget"
  | "collapsedThreads"
  | "setCollapsedThreads"
  | "isSubmitting"
  | "replyErrorMessage"
  | "editingCommentId"
  | "setEditingCommentId"
  | "editCommentText"
  | "setEditCommentText"
  | "isSavingComment"
  | "deletingCommentId"
  | "replyFormRef"
  | "isClinician"
  | "handleStartEditComment"
  | "handleSaveComment"
  | "handleDeleteComment"
  | "handleOpenRemoveReplyModal"
  | "handleSendReply"
> &
  Pick<DiscussionDetailProps, "currentUser">;
export function DiscussionReplies({
  post,
  comments,
  loadingComments,
  replyText,
  setReplyText,
  replyTarget,
  setReplyTarget,
  collapsedThreads,
  setCollapsedThreads,
  isSubmitting,
  replyErrorMessage,
  editingCommentId,
  setEditingCommentId,
  editCommentText,
  setEditCommentText,
  isSavingComment,
  deletingCommentId,
  replyFormRef,
  isClinician,
  handleStartEditComment,
  handleSaveComment,
  handleDeleteComment,
  handleOpenRemoveReplyModal,
  handleSendReply,
  currentUser,
}: Props) {
  const renderReplyForm = () => (
    <form
      ref={replyFormRef}
      onSubmit={handleSendReply}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-xs transition-colors"
    >
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {replyTarget
            ? `Reply to ${replyTarget.author.anonymousHandle}`
            : "Reply to the question"}
        </span>
        <span>
          Replying as:{" "}
          <strong className="text-slate-900 dark:text-slate-100">
            {currentUser.anonymousHandle}
          </strong>
        </span>
      </div>

      {post.condition === "BOTH" && (
        <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
          This discussion is shared with both FTD and Alzheimer's care partners.
          Your reply will be visible to both groups.
        </div>
      )}

      {/* Moderation Mode Info Callout */}
      {post.allowUnmoderatedReplies ? (
        <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl p-3.5 flex items-start sm:items-center gap-2.5 text-sm text-emerald-900 dark:text-emerald-200">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Unmoderated replies enabled for this post:</strong> Your
            reply will be visible immediately to peer care partners without
            moderation delay.
          </span>
        </div>
      ) : (
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl p-3.5 flex items-start sm:items-center gap-2.5 text-sm text-blue-900 dark:text-blue-200">
          <ShieldCheck className="w-4 h-4 text-[#002D72] dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Moderated:</strong> New replies to this post are reviewed by
            the moderator before being published.
          </span>
        </div>
      )}

      {/* Inline Error Notice */}
      {replyErrorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 p-3.5 rounded-xl flex items-center gap-2.5 text-sm animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{replyErrorMessage}</span>
        </div>
      )}

      {replyTarget && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="line-clamp-2 text-slate-500">{replyTarget.content}</p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setReplyTarget(null);
              setReplyText("");
            }}
            className="shrink-0 min-h-11 px-3 font-semibold text-slate-600 dark:text-slate-300"
          >
            Cancel
          </button>
        </div>
      )}
      <textarea
        aria-label={
          replyTarget
            ? `Reply to ${replyTarget.author.anonymousHandle}`
            : "Reply to the question"
        }
        rows={3}
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Share helpful advice, words of encouragement, or practical tips..."
        className="w-full p-3.5 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 font-sans leading-relaxed"
        required
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {post.allowUnmoderatedReplies ? (
          <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Open discussion: replies appear immediately for everyone.
            </span>
          </span>
        ) : (
          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#002D72] dark:text-blue-400 shrink-0" />
            <span>
              Reviewed by the moderator to preserve privacy and community
              safety.
            </span>
          </span>
        )}
        <button
          type="submit"
          disabled={!replyText.trim() || isSubmitting}
          className="min-h-11 px-5 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Post Reply</span>
            </>
          )}
        </button>
      </div>
    </form>
  );

  const renderThread = (node: CommentNode, depth = 0): React.ReactNode => {
    const comm = node.comment;
    const isCommentClinician =
      comm.author.badgeLabel === "Clinician Moderator" ||
      comm.author.anonymousHandle.includes("Dr. Seema");
    const isPending = comm.status === "PENDING_MODERATION";
    const isAuthor =
      comm.author.anonymousHandle === currentUser.anonymousHandle;
    const isEditingThis = editingCommentId === comm.id;

    return (
      <div key={comm.id} data-comment-id={comm.id} className="min-w-0">
        {depth > 4 && (
          <p className="mb-2 text-xs text-slate-500">
            In reply to{" "}
            {comments.find((c) => c.id === comm.parentCommentId)?.author
              .anonymousHandle || "an earlier reply"}
          </p>
        )}
        {node.unavailableParent && (
          <p className="mb-2 text-xs text-slate-500">
            Reply to a removed or unavailable comment
          </p>
        )}
        <div
          className={`rounded-2xl p-4 sm:p-5 text-sm space-y-2.5 border transition ${
            isCommentClinician
              ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60"
              : isPending
                ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60 shadow-2xs"
                : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <span>{comm.author.anonymousHandle}</span>
              {isCommentClinician && (
                <span className="text-xs text-[#002D72] dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/50 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#002D72] dark:text-blue-400" />
                  <span>Clinician</span>
                </span>
              )}
              {isPending && (
                <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                  <span>Under Review</span>
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(comm.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {isEditingThis ? (
            <div className="space-y-2 pt-1">
              <textarea
                rows={3}
                value={editCommentText}
                onChange={(e) => setEditCommentText(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 text-base bg-white dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCommentId(null)}
                  className="min-h-11 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveComment(comm.id)}
                  disabled={isSavingComment || !editCommentText.trim()}
                  className="min-h-11 px-5 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
                >
                  {isSavingComment ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-line select-text">
              {comm.content}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {!post.isClosed && comm.status !== "REJECTED" && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setReplyTarget(comm);
                  setTimeout(
                    () =>
                      replyFormRef.current?.querySelector("textarea")?.focus(),
                    0,
                  );
                }}
                className="inline-flex items-center gap-1.5 min-h-11 font-semibold text-[#002D72] dark:text-sky-400 hover:underline"
              >
                <MessageSquare className="w-4 h-4" /> Reply
              </button>
            )}
            {node.children.length > 0 && (
              <button
                type="button"
                aria-expanded={!collapsedThreads.has(comm.id)}
                aria-controls={`thread-${comm.id}`}
                onClick={() =>
                  setCollapsedThreads((prev) => {
                    const next = new Set(prev);
                    if (next.has(comm.id)) next.delete(comm.id);
                    else next.add(comm.id);
                    return next;
                  })
                }
                className="min-h-11 text-slate-500 hover:underline"
              >
                {collapsedThreads.has(comm.id)
                  ? "Show replies"
                  : "Hide replies"}{" "}
                ({node.children.length})
              </button>
            )}
          </div>
          {/* Actions for comments */}
          {((isPending && isAuthor && !isEditingThis) ||
            (isClinician &&
              (post.allowUnmoderatedReplies ||
                comm.status === "APPROVED"))) && (
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {post.allowUnmoderatedReplies && !isPending && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                    <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Unmoderated reply</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Author actions on pending reply */}
                {isPending && isAuthor && !isEditingThis && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEditComment(comm)}
                      className="min-h-11 px-3.5 py-2 text-sm bg-white dark:bg-slate-800 hover:bg-amber-100/50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Edit reply</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comm.id)}
                      className="min-h-11 px-3.5 py-2 text-sm bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                      <span>Cancel reply</span>
                    </button>
                  </>
                )}

                {/* Clinician Moderator Remove Reply Button */}
                {isClinician &&
                  (post.allowUnmoderatedReplies ||
                    comm.status === "APPROVED") && (
                    <button
                      type="button"
                      onClick={() => handleOpenRemoveReplyModal(comm)}
                      disabled={deletingCommentId === comm.id}
                      className="min-h-11 px-3.5 py-2 text-sm bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                      title="Remove inappropriate reply from discussion"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Remove reply</span>
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
        {replyTarget?.id === comm.id && !post.isClosed && (
          <div className="mt-3">{renderReplyForm()}</div>
        )}
        {node.children.length > 0 && (
          <div
            id={`thread-${comm.id}`}
            hidden={collapsedThreads.has(comm.id)}
            className={`mt-3 space-y-3 ${depth < 4 ? "border-l-2 border-slate-200 dark:border-slate-700 ml-2 pl-3 sm:ml-4 sm:pl-4" : ""}`}
          >
            {node.children.map((child) => renderThread(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Replies Thread Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Community Replies ({comments.length})
        </h2>
        {replyTarget && !post.isClosed && (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setReplyTarget(null);
              setTimeout(
                () => replyFormRef.current?.querySelector("textarea")?.focus(),
                0,
              );
            }}
            className="min-h-11 text-sm font-semibold text-[#002D72] dark:text-sky-400 hover:underline"
          >
            Reply to the question instead
          </button>
        )}

        {loadingComments ? (
          <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
            Loading replies...
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400 text-sm space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              No replies yet.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
              Be the first to share your experience or practical advice.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {buildCommentTree(comments).map((node) => renderThread(node))}
          </div>
        )}

        {/* Reply Composer Form OR Closed Discussion Notice (Preserves existing replies!) */}
        {post.isClosed ? (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 sm:p-7 text-center space-y-2.5 transition-colors shadow-2xs">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-semibold text-slate-900 dark:text-white text-base">
                This discussion has been closed
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                New replies are disabled because this discussion was closed by
                the moderator
                {post.closedAt
                  ? ` on ${new Date(post.closedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
                  : ""}
                . All {comments.length} existing replies above are preserved for
                community reference.
              </p>
            </div>
          </div>
        ) : (
          !replyTarget && renderReplyForm()
        )}
      </section>
    </>
  );
}
