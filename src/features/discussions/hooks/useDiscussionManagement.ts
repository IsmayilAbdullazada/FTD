import { useState, type Dispatch, type SetStateAction } from 'react';
import { discussionApi } from '@/features/discussions/api/discussionApi';
import {
  filterDiscussions,
  replacePost,
  updatePostReplyPolicy,
  type DiscussionPolicyFilter,
} from '@/features/discussions/lib/discussionManagement';
import type { Condition, CurrentUser, Post } from '@/types';

interface UseDiscussionManagementOptions {
  currentUser: CurrentUser;
  audienceFilter: 'all' | Condition;
  onQueueUpdated: () => void;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export const useDiscussionManagement = ({
  currentUser,
  audienceFilter,
  onQueueUpdated,
  setActionSuccessNotice,
}: UseDiscussionManagementOptions) => {
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [searchPostsQuery, setSearchPostsQuery] = useState('');
  const [postsPolicyFilter, setPostsPolicyFilter] = useState<DiscussionPolicyFilter>('all');
  const [postToClose, setPostToClose] = useState<Post | null>(null);
  const [isTogglingClose, setIsTogglingClose] = useState(false);

  const loadPublishedPosts = async () => {
    setLoadingPosts(true);
    try {
      const response = await discussionApi.getPosts({
        role: currentUser.role,
        userId: currentUser.id,
        condition: audienceFilter === 'all' ? undefined : audienceFilter,
      });
      setPublishedPosts(response.posts || []);
    } catch (error) {
      console.error('Failed to load published posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleTogglePostRepliesMode = async (post: Post) => {
    const newAllowUnmoderated = !post.allowUnmoderatedReplies;

    setPublishedPosts((previous) =>
      updatePostReplyPolicy(previous, post.id, newAllowUnmoderated)
    );

    try {
      await discussionApi.togglePostUnmoderatedReplies(post.id, newAllowUnmoderated);
      setActionSuccessNotice(
        newAllowUnmoderated
          ? `Replies for "${post.title.slice(0, 32)}..." are now unmoderated (open to all).`
          : `Replies for "${post.title.slice(0, 32)}..." now require clinical moderation.`
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onQueueUpdated();
    } catch (error) {
      console.error('Failed to update reply moderation policy:', error);
      setPublishedPosts((previous) =>
        updatePostReplyPolicy(previous, post.id, !newAllowUnmoderated)
      );
      setActionSuccessNotice('Failed to update reply moderation policy.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    }
  };

  const handleTogglePostClose = async (post: Post) => {
    setIsTogglingClose(true);
    const targetClosed = !post.isClosed;
    try {
      const response = await discussionApi.closePost(post.id, targetClosed, currentUser.id);
      setPublishedPosts((previous) => replacePost(previous, response.post));
      setActionSuccessNotice(
        targetClosed
          ? `Discussion "${post.title.slice(0, 32)}..." closed. New replies are now disabled.`
          : `Discussion "${post.title.slice(0, 32)}..." reopened. Care partners can reply again.`
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
      onQueueUpdated();
      setPostToClose(null);
    } catch (error) {
      console.error('Failed to toggle post closed state:', error);
      setActionSuccessNotice('Failed to update discussion status.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsTogglingClose(false);
    }
  };

  const filteredDiscussions = filterDiscussions(
    publishedPosts,
    postsPolicyFilter,
    searchPostsQuery,
  );

  return {
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

