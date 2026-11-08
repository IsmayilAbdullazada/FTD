import { useEffect } from 'react';
import { authApi } from '@/features/auth/api/authApi';
import { CurrentUser } from '@/types';
import {
  DiscussionDraft,
  pushSignedOutLocation,
  pushTabLocation,
  readAppLocation,
  replaceAuthenticatedLocation,
} from '@/app/lib/appLocation';
import { useAppData } from './useAppData';
import { useAppViewState } from './useAppViewState';

function defaultTabFor(user: CurrentUser): string {
  return user.role === 'CLINICIAN_MODERATOR' || user.role === 'SYSTEM_ADMIN'
    ? 'moderation'
    : 'feed';
}

export function useAppController() {
  const data = useAppData();
  const view = useAppViewState();
  const { currentUser, allPersonas } = data.values;
  const {
    setActiveTab,
    setFeedNotice,
    setSessionNotice,
    setFeedResetKey,
    setTargetDiscussionId,
    setFeedSection,
    setIsAssistantOpen,
    setAssistantPrefill,
    setIsInviteOpen,
    setIsAuditOpen,
    setIsNotificationsOpen,
    setInspectedResourceId,
    setComposerInitialTitle,
    setComposerInitialContent,
    setAuthMode,
    setAuthInviteToken,
    setIsAuthOpen,
  } = view.setters;

  function clearComposer(): void {
    setComposerInitialTitle('');
    setComposerInitialContent('');
  }

  function applyInitialLocation(user: CurrentUser): void {
    const { tab, postId, inviteToken, discussionDraft } = readAppLocation();

    if (inviteToken) {
      setAuthInviteToken(inviteToken);
      setAuthMode('register');
      setIsAuthOpen(true);
    } else if (tab === 'login') {
      setAuthMode('login');
      setIsAuthOpen(true);
    } else if (tab === 'forgot-password' || tab === 'reset-password') {
      setAuthMode('forgot-password');
      setIsAuthOpen(true);
    } else if (postId) {
      setTargetDiscussionId(postId);
      setActiveTab('feed');
    } else if (tab) {
      if (tab === 'compose' && discussionDraft) {
        setComposerInitialTitle(discussionDraft.title || '');
        setComposerInitialContent(discussionDraft.content || '');
      }
      setActiveTab(tab);
    } else {
      setActiveTab(defaultTabFor(user));
    }
  }

  function syncNavigationFromLocation(): void {
    const location = readAppLocation('feed');
    const tab = location.tab || 'feed';
    const { postId, inviteToken, discussionDraft } = location;

    if (inviteToken) {
      setAuthInviteToken(inviteToken);
      setAuthMode('register');
      setIsAuthOpen(true);
    } else if (tab === 'login') {
      setAuthMode('login');
      setIsAuthOpen(true);
    } else if (tab === 'forgot-password') {
      setAuthMode('forgot-password');
      setIsAuthOpen(true);
    } else {
      setIsAuthOpen(false);
      if (tab === 'compose') {
        setComposerInitialTitle(discussionDraft?.title || '');
        setComposerInitialContent(discussionDraft?.content || '');
      }
      setActiveTab(tab);
      setTargetDiscussionId(postId);
    }
  }

  function signOut(notice?: string): void {
    void authApi.logout();
    clearComposer();
    data.actions.setCurrentUser(null);
    setSessionNotice(notice || null);
    setAuthMode('login');
    setIsAuthOpen(true);
    pushSignedOutLocation();
  }

  useEffect(() => {
    void data.actions.loadUserAndData(undefined, applyInitialLocation);

    const handleSessionExpired = (event: Event) => {
      const reason =
        (event as CustomEvent<{ reason?: string }>).detail?.reason ||
        'Your session expired. Please sign in again.';
      signOut(reason);
    };

    window.addEventListener('popstate', syncNavigationFromLocation);
    window.addEventListener('jh:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('popstate', syncNavigationFromLocation);
      window.removeEventListener('jh:session-expired', handleSessionExpired);
    };
  }, []);

  async function loginSucceeded(user: CurrentUser): Promise<void> {
    const nextTab = defaultTabFor(user);
    replaceAuthenticatedLocation(nextTab);
    setSessionNotice(null);
    setAuthInviteToken(undefined);
    setIsAuthOpen(false);
    data.actions.setCurrentUser(user);
    setActiveTab(nextTab);
    await data.actions.loadUserAndData(user.id);
  }

  function switchPersona(userId: string): void {
    clearComposer();
    void data.actions.loadUserAndData(userId);
    setFeedResetKey((previous) => previous + 1);
    setTargetDiscussionId(null);
    const persona = allPersonas.find((candidate) => candidate.id === userId);
    const nextTab =
      persona?.role === 'CLINICIAN_MODERATOR' ||
      persona?.role === 'SYSTEM_ADMIN'
        ? 'moderation'
        : 'feed';
    setActiveTab(nextTab);
    pushTabLocation(nextTab);
  }

  function selectTab(tab: string): void {
    if (tab === 'feed') setFeedResetKey((previous) => previous + 1);
    setActiveTab(tab);
    setTargetDiscussionId(null);
    pushTabLocation(tab);
  }

  function openDiscussion(postId: string): void {
    setTargetDiscussionId(postId);
    setActiveTab('feed');
    pushTabLocation('feed', postId);
  }

  function openResource(resourceId: string): void {
    setInspectedResourceId(resourceId);
    setActiveTab('knowledge');
    pushTabLocation('knowledge');
  }

  function openMyPosts(): void {
    setActiveTab('feed');
    setFeedSection('my-posts');
    setTargetDiscussionId(null);
    pushTabLocation('feed');
  }

  function createDiscussion(draft: DiscussionDraft): void {
    setComposerInitialTitle(draft.title);
    setComposerInitialContent(draft.content);
    setActiveTab('compose');
    setIsAssistantOpen(false);
    pushTabLocation('compose', null, draft);
  }

  return {
    state: { ...data.values, ...view.values },
    actions: {
      loginSucceeded,
      signOut,
      switchPersona,
      queueUpdated: () =>
        data.actions.refreshQueueAndNotifications(currentUser),
      selectTab,
      openDiscussion,
      openDiscussionFromComposer: (postId: string) => {
        clearComposer();
        openDiscussion(postId);
      },
      openResource,
      openMyPosts,
      openComposer: () => {
        clearComposer();
        selectTab('compose');
      },
      postSubmitted: () => {
        clearComposer();
        setFeedNotice(
          'Your post has been submitted and is currently under review.',
        );
        setFeedSection('my-posts');
        selectTab('feed');
        void data.actions.refreshQueueAndNotifications(currentUser);
      },
      cancelComposer: () => {
        clearComposer();
        selectTab('feed');
      },
      cohortCreated: () => data.actions.reloadCohorts(currentUser),
      createDiscussion,
      closeAuth: () => setIsAuthOpen(false),
      openNotifications: () => setIsNotificationsOpen(true),
      closeNotifications: () => setIsNotificationsOpen(false),
      clearTargetDiscussion: () => setTargetDiscussionId(null),
      dismissFeedNotice: () => setFeedNotice(null),
      changeFeedSection: setFeedSection,
      openAssistant: (query: string) => {
        setAssistantPrefill({ query });
        setIsAssistantOpen(true);
      },
      openAudit: () => setIsAuditOpen(true),
      closeAudit: () => setIsAuditOpen(false),
      openInvite: () => setIsInviteOpen(true),
      closeInvite: () => setIsInviteOpen(false),
      clearInspectedResource: () => setInspectedResourceId(null),
      toggleAssistant: () => setIsAssistantOpen((open) => !open),
      closeAssistant: () => setIsAssistantOpen(false),
      refreshNotifications: () => {
        if (currentUser) void data.actions.loadUserAndData(currentUser.id);
      },
      navigateToConsole: () => setActiveTab('moderation'),
      navigateToFeed: () => setActiveTab('feed'),
      sessionTimedOut: () =>
        signOut(
          'Your session timed out due to inactivity to protect patient and caregiver privacy. Please sign in again.',
        ),
    },
  };
}
