import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { discussionApi } from '@/features/discussions/api/discussionApi';
import type { Audience, CurrentUser } from '@/types';

interface UseCreatePostFormOptions {
  currentUser: CurrentUser;
  loadPublishedPosts: () => Promise<void>;
  onAudienceReset: () => void;
  onPostCreated: () => void;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export function useCreatePostForm({
  currentUser,
  loadPublishedPosts,
  onAudienceReset,
  onPostCreated,
  setActionSuccessNotice,
}: UseCreatePostFormOptions) {
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [npTitle, setNpTitle] = useState('');
  const [npContent, setNpContent] = useState('');
  const [npGroupId, setNpGroupId] = useState('');
  const [npAudience, setNpAudience] = useState<Audience | ''>('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

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

  return {
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
    handleCreatePost,
  };
}
