import { useEffectEvent } from 'react';
import { useRef } from 'react';
import { reportError } from '@/shared/lib/logger';
import { discussionApi } from '@/features/discussions/api/discussionApi';
import {
  filterDiscussions,
  replacePost,
  updatePostReplyPolicy,
  type DiscussionPolicyFilter,
} from '@/features/discussions/lib/discussionManagement';
import type { Condition, CurrentUser, Post } from '@/types';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

interface UseDiscussionManagementOptions {
  currentUser: CurrentUser;
  audienceFilter: 'all' | Condition;
  onQueueUpdated: () => void;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export const useDiscussionManagement = ({
  audienceFilter,
  onQueueUpdated,
  setActionSuccessNotice,
}: UseDiscussionManagementOptions) => {
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [searchPostsQuery, setSearchPostsQuery] = useState('');
  const [postsPolicyFilter, setPostsPolicyFilter] =
    useState<DiscussionPolicyFilter>('all');
  const [postToClose, setPostToClose] = useState<Post | null>(null);
  const [isTogglingClose, setIsTogglingClose] = useState(false);

  const requestVersion = useRef(0);
  const loadPublishedPosts = async () => {
    const version = ++requestVersion.current;
    setLoadingPosts(true);
    try {
      const response = await discussionApi.getPosts({
        page,
        pageSize: 10,
        search: searchPostsQuery,
        policy: postsPolicyFilter,
        condition: audienceFilter === 'all' ? undefined : audienceFilter,
      });
      if (version !== requestVersion.current) return;
      setPublishedPosts(response.posts || []);
      setTotal(response.total);
      if (page > 1 && response.posts.length === 0) setPage(page - 1);
    } catch (error) {
      reportError('Failed to load published posts:', error);
    } finally {
      if (version === requestVersion.current) setLoadingPosts(false);
    }
  };

  const handleTogglePostRepliesMode = async (post: Post) => {
    const newAllowUnmoderated = !post.allowUnmoderatedReplies;

    setPublishedPosts((previous) =>
      updatePostReplyPolicy(previous, post.id, newAllowUnmoderated),
    );

    try {
      await discussionApi.togglePostUnmoderatedReplies(
        post.id,
        newAllowUnmoderated,
      );
      setActionSuccessNotice(
        newAllowUnmoderated
          ? `Replies for "${post.title.slice(0, 32)}..." are now unmoderated (open to all).`
          : `Replies for "${post.title.slice(0, 32)}..." now require clinical moderation.`,
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onQueueUpdated();
    } catch (error) {
      reportError('Failed to update reply moderation policy:', error);
      setPublishedPosts((previous) =>
        updatePostReplyPolicy(previous, post.id, !newAllowUnmoderated),
      );
      setActionSuccessNotice('Failed to update reply moderation policy.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  const handleTogglePostClose = async (post: Post) => {
    setIsTogglingClose(true);
    const targetClosed = !post.isClosed;
    try {
      const response = await discussionApi.closePost(post.id, targetClosed);
      setPublishedPosts((previous) => replacePost(previous, response.post));
      setActionSuccessNotice(
        targetClosed
          ? `Discussion "${post.title.slice(0, 32)}..." closed. New replies are now disabled.`
          : `Discussion "${post.title.slice(0, 32)}..." reopened. Care partners can reply again.`,
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onQueueUpdated();
      setPostToClose(null);
    } catch (error) {
      reportError('Failed to toggle post closed state:', error);
      setActionSuccessNotice('Failed to update discussion status.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsTogglingClose(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [audienceFilter, searchPostsQuery, postsPolicyFilter]);
  const loadPostsEffect = useEffectEvent(() => loadPublishedPosts());
  useEffect(() => {
    loadPostsEffect();
  }, [page, audienceFilter, searchPostsQuery, postsPolicyFilter]);

  const filteredDiscussions = filterDiscussions(
    publishedPosts,
    postsPolicyFilter,
    searchPostsQuery,
  );

  return {
    discussionPage: {
      items: publishedPosts,
      page,
      pageCount: Math.max(1, Math.ceil(total / 10)),
      start: (page - 1) * 10,
      total,
      pageSize: 10,
      setPage,
    },
    publishedPosts,
    filteredDiscussions,
    loadingPosts,
    searchPostsQuery,
    setSearchPostsQuery,
    postsPolicyFilter,
    setPostsPolicyFilter,
    postToClose,
    setPostToClose,
    isTogglingClose,
    loadPublishedPosts,
    handleTogglePostRepliesMode,
    handleTogglePostClose,
  };
};
