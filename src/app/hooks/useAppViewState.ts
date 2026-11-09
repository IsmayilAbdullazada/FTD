import { useState } from 'react';
import { useAutoDismiss } from '@/app/hooks/useAutoDismiss';

export type AuthMode = 'login' | 'forgot-password' | 'register';
export type FeedSection = 'all' | 'my-posts';

export function useAppViewState() {
  const [activeTab, setActiveTab] = useState('feed');
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [feedResetKey, setFeedResetKey] = useState(0);
  const [targetDiscussionId, setTargetDiscussionId] = useState<string | null>(
    null,
  );
  const [feedSection, setFeedSection] = useState<FeedSection>('all');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantPrefill, setAssistantPrefill] = useState<{
    query: string;
  } | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [inspectedResourceId, setInspectedResourceId] = useState<string | null>(
    null,
  );
  const [composerInitialTitle, setComposerInitialTitle] = useState('');
  const [composerInitialContent, setComposerInitialContent] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authInviteToken, setAuthInviteToken] = useState<string>();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useAutoDismiss(feedNotice, setFeedNotice, 3500);

  return {
    values: {
      activeTab,
      feedNotice,
      sessionNotice,
      feedResetKey,
      targetDiscussionId,
      feedSection,
      isAssistantOpen,
      assistantPrefill,
      isInviteOpen,
      isAuditOpen,
      isNotificationsOpen,
      inspectedResourceId,
      composerInitialTitle,
      composerInitialContent,
      authMode,
      authInviteToken,
      isAuthOpen,
    },
    setters: {
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
    },
  };
}
