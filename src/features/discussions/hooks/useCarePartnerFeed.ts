import { reportError } from '@/shared/lib/logger';
import { discussionApi } from '@/features/discussions/api/discussionApi';
import { moderationApi } from '@/features/moderation/api/moderationApi';
import { CommunityGroup, CurrentUser, Post } from '@/types';
import React, { useEffect, useRef, useState } from 'react';

export interface CarePartnerFeedProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  resetKey?: number;
  targetDiscussionId?: string | null;
  onClearTargetDiscussion?: () => void;
  recentNotice?: string | null;
  onDismissNotice?: () => void;
  onOpenComposer: () => void;
  initialSection?: 'all' | 'my-posts';
  onSectionChange?: (section: 'all' | 'my-posts') => void;
}

export function useCarePartnerFeed({
  currentUser,
  cohorts,
  resetKey,
  targetDiscussionId,
  onClearTargetDiscussion,
  recentNotice,
  onDismissNotice,
  onOpenComposer,
  initialSection,
  onSectionChange,
}: CarePartnerFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewSection, setViewSection] = useState<'all' | 'my-posts'>(
    initialSection || 'all',
  );
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    'all' | 'open' | 'closed'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const POSTS_PER_PAGE = 5;
  const [totalPosts, setTotalPosts] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Sync viewSection when initialSection prop changes (e.g. from header profile dropdown or post submit)
  useEffect(() => {
    if (initialSection) {
      setViewSection(initialSection);
      setCurrentPage(1);
    }
  }, [initialSection]);

  const handleSectionChange = (sec: 'all' | 'my-posts') => {
    setViewSection(sec);
    setCurrentPage(1);
    if (onSectionChange) onSectionChange(sec);
  };

  // Check user role
  const isStaff = currentUser.role !== 'CARE_PARTNER';
  const isCarePartner = currentUser.role === 'CARE_PARTNER';
  const [selectedCondition, setSelectedCondition] = useState<
    'all' | 'FTD' | 'AD'
  >('all');

  // Filter Popover Menu State
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement | null>(null);

  // Close filter popover on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(event.target as Node)
      ) {
        setIsFilterMenuOpen(false);
      }
    };
    if (isFilterMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isFilterMenuOpen]);

  // Popstate listener to handle browser / phone back button navigation
  useEffect(() => {
    const handlePopState = async () => {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get('post');
      if (!postId) {
        setSelectedPost(null);
      } else if (selectedPost?.id !== postId) {
        const found = posts.find((p) => p.id === postId);
        if (found) {
          setSelectedPost(found);
        } else {
          try {
            const details = await discussionApi.getPostDetails(
              postId,
              currentUser.role,
              currentUser.id,
            );
            if (details.post) {
              setSelectedPost(details.post);
            }
          } catch (err) {
            reportError('Failed to load deep-linked post:', err);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [posts, selectedPost, currentUser.role, currentUser.id]);

  // Deep-linking or target discussion navigation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPostId = params.get('post');
    const effectiveTargetId = targetDiscussionId || urlPostId;

    if (effectiveTargetId) {
      const match = posts.find((p) => p.id === effectiveTargetId);
      if (match) {
        setSelectedPost(match);
        if (onClearTargetDiscussion) onClearTargetDiscussion();
      } else if (!loading) {
        discussionApi
          .getPostDetails(effectiveTargetId, currentUser.role, currentUser.id)
          .then((res) => {
            if (res.post) {
              setSelectedPost(res.post);
              if (onClearTargetDiscussion) onClearTargetDiscussion();
            }
          })
          .catch((err) => reportError('Failed to load target post:', err));
      }
    } else if (!urlPostId && !targetDiscussionId) {
      setSelectedPost(null);
    }
  }, [
    targetDiscussionId,
    totalPosts,
    posts,
    loading,
    onClearTargetDiscussion,
    currentUser.role,
    currentUser.id,
  ]);

  // Editing pending post
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCohortId, setEditCohortId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // In-UI cancellation confirmation modal
  const [confirmDeletePost, setConfirmDeletePost] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  // Care partner private replies to clinical moderators
  const [carePartnerReplyText, setCarePartnerReplyText] = useState<
    Record<string, string>
  >({});
  const [isSendingCareReply, setIsSendingCareReply] = useState<
    Record<string, boolean>
  >({});
  const [careReplyExpanded, setCareReplyExpanded] = useState<
    Record<string, boolean>
  >({});

  // Auto-fade action notice after 3.5 seconds
  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => {
      setActionNotice(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  // If user clicks "Discussions" from navbar/bottom bar, return to feed list
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setSelectedPost(null);
    }
  }, [resetKey]);

  const handleOpenDiscussion = (post: Post) => {
    setSelectedPost(post);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'feed');
    url.searchParams.set('post', post.id);
    window.history.pushState(
      { tab: 'feed', post: post.id },
      '',
      url.toString(),
    );
  };

  const handleBackToFeed = () => {
    setSelectedPost(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has('post')) {
      url.searchParams.delete('post');
      window.history.pushState({ tab: 'feed', post: null }, '', url.toString());
    }
    if (onClearTargetDiscussion) onClearTargetDiscussion();
    loadFeed(selectedGroupTab);
  };

  const requestVersion = useRef(0);
  const loadFeed = async (groupId?: string) => {
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const res = await discussionApi.getPosts({
        page: currentPage,
        pageSize: POSTS_PER_PAGE,
        search: searchQuery,
        section: viewSection,
        closed: selectedStatusFilter,
        role: currentUser.role,
        groupId: groupId === 'all' ? undefined : groupId,
        userId: currentUser.id,
        condition:
          isStaff && selectedCondition !== 'all'
            ? selectedCondition
            : undefined,
      });
      if (version !== requestVersion.current) return;
      let feedPosts = res.posts || [];
      // Clinician moderators and admins only view published discussions in the discussions tab
      if (
        currentUser.role === 'CLINICIAN_MODERATOR' ||
        currentUser.role === 'SYSTEM_ADMIN'
      ) {
        feedPosts = feedPosts.filter((p) => p.status === 'APPROVED');
      }
      setPosts(feedPosts);
      setTotalPosts(res.total);

      // Sync upvote states from server
      const initialLikes: Record<string, boolean> = {};
      feedPosts.forEach((p) => {
        if (p.isUpvoted !== undefined) {
          initialLikes[p.id] = p.isUpvoted;
        }
      });
      setLikedPosts((prev) => ({ ...initialLikes, ...prev }));
    } catch (err) {
      reportError('Failed to load feed:', err);
    } finally {
      if (version !== requestVersion.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(selectedGroupTab);
  }, [
    selectedGroupTab,
    selectedCondition,
    currentUser.role,
    currentUser.id,
    currentPage,
    searchQuery,
    viewSection,
    selectedStatusFilter,
  ]);

  const handleToggleLike = async (e: React.MouseEvent, postId: string) => {
    e.stopPropagation();
    const currentPost = posts.find((p) => p.id === postId);
    const wasLiked =
      likedPosts[postId] !== undefined
        ? likedPosts[postId]
        : Boolean(currentPost?.isUpvoted);
    const newLiked = !wasLiked;

    setLikedPosts((prev) => ({ ...prev, [postId]: newLiked }));
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const delta = newLiked ? 1 : -1;
          return {
            ...p,
            upvotes: Math.max(0, p.upvotes + delta),
            isUpvoted: newLiked,
          };
        }
        return p;
      }),
    );

    try {
      const res = await discussionApi.togglePostUpvote(postId, currentUser.id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, upvotes: res.upvotes, isUpvoted: res.isUpvoted }
            : p,
        ),
      );
      setLikedPosts((prev) => ({ ...prev, [postId]: res.isUpvoted }));
    } catch (err) {
      reportError('Failed to upvote post:', err);
    }
  };

  const handleStartEdit = (post: Post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCohortId(post.assignedGroups[0]?.id || cohorts[0]?.id || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    setIsSavingEdit(true);
    try {
      await discussionApi.updatePost(editingPost.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        targetCohortId: editCohortId,
      });
      setEditingPost(null);
      if (onDismissNotice) onDismissNotice();
      setActionNotice('Your question was updated and remains under review.');
      await loadFeed(selectedGroupTab);
    } catch (err) {
      reportError('Failed to update post:', err);
      setActionNotice('Failed to update question. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!confirmDeletePost) return;

    const targetPostId = confirmDeletePost.id;
    setIsDeletingPost(true);

    // 1. Optimistic removal from display immediately
    setPosts((prev) => prev.filter((p) => p.id !== targetPostId));
    setConfirmDeletePost(null);

    // 2. Clear any prior notices and show immediate confirmation toast
    if (onDismissNotice) onDismissNotice();
    setActionNotice('Your question has been withdrawn.');

    // 3. Delete on server
    try {
      await discussionApi.deletePost(targetPostId);
      await loadFeed(selectedGroupTab);
    } catch (err) {
      reportError('Failed to withdraw post:', err);
      setActionNotice('Unable to withdraw question. Please try again.');
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleSendPrivateCareReply = async (postId: string) => {
    const message = carePartnerReplyText[postId]?.trim();
    if (!message || isSendingCareReply[postId]) return;

    setIsSendingCareReply((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await moderationApi.sendPostPrivateNote(postId, {
        message,
        senderId: currentUser.id,
        action: 'KEEP_PENDING',
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                moderatorPrivateNotes: [
                  ...(p.moderatorPrivateNotes || []),
                  res.note,
                ],
              }
            : p,
        ),
      );

      setCarePartnerReplyText((prev) => ({ ...prev, [postId]: '' }));
      setActionNotice('Your private reply was sent to the moderator.');
    } catch (err: unknown) {
      reportError('Failed to send private reply:', err);
      setActionNotice(
        (err instanceof Error ? err.message : undefined) ||
          'Could not send reply. Please try again.',
      );
    } finally {
      setIsSendingCareReply((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return {
    totalPosts,
    posts,
    setPosts,
    loading,
    setLoading,
    viewSection,
    setViewSection,
    selectedGroupTab,
    setSelectedGroupTab,
    selectedStatusFilter,
    setSelectedStatusFilter,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    POSTS_PER_PAGE,
    likedPosts,
    setLikedPosts,
    selectedPost,
    setSelectedPost,
    handleSectionChange,
    isStaff,
    isCarePartner,
    selectedCondition,
    setSelectedCondition,
    isFilterMenuOpen,
    setIsFilterMenuOpen,
    filterPopoverRef,
    editingPost,
    setEditingPost,
    editTitle,
    setEditTitle,
    editContent,
    setEditContent,
    editCohortId,
    setEditCohortId,
    isSavingEdit,
    setIsSavingEdit,
    actionNotice,
    setActionNotice,
    confirmDeletePost,
    setConfirmDeletePost,
    isDeletingPost,
    setIsDeletingPost,
    carePartnerReplyText,
    setCarePartnerReplyText,
    isSendingCareReply,
    setIsSendingCareReply,
    careReplyExpanded,
    setCareReplyExpanded,
    handleOpenDiscussion,
    handleBackToFeed,
    loadFeed,
    handleToggleLike,
    handleStartEdit,
    handleSaveEdit,
    handleConfirmWithdraw,
    handleSendPrivateCareReply,
  };
}
