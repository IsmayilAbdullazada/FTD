import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { discussionApi } from '@/features/discussions/api/discussionApi';
import type { Audience, Condition, CurrentUser, Post } from '@/types';

interface UseDiscussionManagementOptions {
  currentUser: CurrentUser;
  audienceFilter: 'all' | Condition;
  onAudienceReset: () => void;
  onPostCreated: () => void;
  onQueueUpdated: () => void;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export const useDiscussionManagement = ({
  currentUser,
  audienceFilter,
  onAudienceReset,
  onPostCreated,
  onQueueUpdated,
  setActionSuccessNotice,
}: UseDiscussionManagementOptions) => {
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [searchPostsQuery, setSearchPostsQuery] = useState('');
  const [postsPolicyFilter, setPostsPolicyFilter] = useState<'all' | 'moderated' | 'unmoderated' | 'closed'>('all');
  const [postToClose, setPostToClose] = useState<Post | null>(null);
  const [isTogglingClose, setIsTogglingClose] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [npTitle, setNpTitle] = useState('');
  const [npContent, setNpContent] = useState('');
  const [npGroupId, setNpGroupId] = useState('');
  const [npAudience, setNpAudience] = useState<Audience | ''>('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

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

  const handleCreatePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!npTitle.trim() || !npContent.trim() || !npGroupId || !npAudience || isSubmittingPost) return;
    setIsSubmittingPost(true);
    try {
      await discussionApi.createPost({
        title: npTitle.trim(),
        content: npContent.trim(),
        targetCohortId: npGroupId,
        authorId: currentUser.id,
        condition: npAudience,
      });
      setShowNewPostModal(false);
      setNpTitle('');
      setNpContent('');
      setNpGroupId('');
      setNpAudience('');
      onAudienceReset();
      await loadPublishedPosts();
      onPostCreated();
      setActionSuccessNotice('Post published.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    } catch (error) {
      console.error('Failed to create post:', error);
      setActionSuccessNotice('Could not publish post. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  const handleTogglePostRepliesMode = async (post: Post) => {
    const newAllowUnmoderated = !post.allowUnmoderatedReplies;

    setPublishedPosts((previous) =>
      previous.map((item) =>
        item.id === post.id ? { ...item, allowUnmoderatedReplies: newAllowUnmoderated } : item
      )
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
        previous.map((item) =>
          item.id === post.id ? { ...item, allowUnmoderatedReplies: !newAllowUnmoderated } : item
        )
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
      setPublishedPosts((previous) =>
        previous.map((item) =>
          item.id === post.id
            ? {
                ...item,
                isClosed: response.post.isClosed,
                closedAt: response.post.closedAt,
                closedBy: response.post.closedBy,
              }
            : item
        )
      );
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

  const filteredDiscussions = publishedPosts.filter((post) => {
    if (postsPolicyFilter === 'moderated' && (post.allowUnmoderatedReplies || post.isClosed)) return false;
    if (postsPolicyFilter === 'unmoderated' && (!post.allowUnmoderatedReplies || post.isClosed)) return false;
    if (postsPolicyFilter === 'closed' && !post.isClosed) return false;
    if (searchPostsQuery.trim()) {
      const query = searchPostsQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.author.anonymousHandle.toLowerCase().includes(query)
      );
    }
    return true;
  });

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
    showNewPostModal,
    setShowNewPostModal,
    npTitle,
    setNpTitle,
    npContent,
    setNpContent,
    npGroupId,
    setNpGroupId,
    npAudience,
    setNpAudience,
    isSubmittingPost,
    loadPublishedPosts,
    handleCreatePost,
    handleTogglePostRepliesMode,
    handleTogglePostClose,
  };
};
