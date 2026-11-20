export interface DiscussionDraft {
  title: string;
  content: string;
}

export interface AppLocation {
  tab: string | null;
  postId: string | null;
  resourceId: string | null;
  inviteToken: string | null;
  discussionDraft?: DiscussionDraft;
}

export function normalizeTab(tab: string | null): string | null {
  return tab &&
    ![
      'feed',
      'compose',
      'knowledge',
      'updates',
      'calendar',
      'moderation',
      'audit',
      'login',
      'forgot-password',
      'reset-password',
    ].includes(tab)
    ? 'feed'
    : tab;
}

export function permittedTab(tab: string, role: string): string {
  return role === 'CARE_PARTNER' && (tab === 'moderation' || tab === 'audit')
    ? 'feed'
    : normalizeTab(tab) || 'feed';
}

export function readAppLocation(defaultTab: string | null = null): AppLocation {
  const params = new URLSearchParams(window.location.search);
  return {
    tab: normalizeTab(params.get('tab') || defaultTab),
    resourceId: params.get('resource'),
    postId: params.get('post'),
    inviteToken: params.get('token'),
    discussionDraft: window.history.state?.discussionDraft,
  };
}

export function replaceAuthenticatedLocation(tab: string): void {
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.searchParams.delete('token');
  url.searchParams.set('tab', tab);
  window.history.replaceState({ tab }, '', url.toString());
}

export function pushSignedOutLocation(): void {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'login');
  url.searchParams.delete('post');
  url.searchParams.delete('token');
  window.history.pushState({ tab: 'login' }, '', url.toString());
}

export function pushTabLocation(
  tab: string,
  postId: string | null = null,
  discussionDraft?: DiscussionDraft,
  resourceId?: string,
): void {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  if (resourceId) url.searchParams.set('resource', resourceId);
  else url.searchParams.delete('resource');
  if (postId) url.searchParams.set('post', postId);
  else url.searchParams.delete('post');
  window.history.pushState(
    { tab, post: postId, ...(discussionDraft && { discussionDraft }) },
    '',
    url.toString(),
  );
}
