export interface DiscussionDraft {
  title: string;
  content: string;
}

export interface AppLocation {
  tab: string | null;
  postId: string | null;
  inviteToken: string | null;
  discussionDraft?: DiscussionDraft;
}

export function readAppLocation(defaultTab: string | null = null): AppLocation {
  const params = new URLSearchParams(window.location.search);
  return {
    tab: params.get('tab') || defaultTab,
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
): void {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  if (postId) url.searchParams.set('post', postId);
  else url.searchParams.delete('post');
  window.history.pushState(
    { tab, post: postId, ...(discussionDraft && { discussionDraft }) },
    '',
    url.toString(),
  );
}
