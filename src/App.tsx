import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CarePartnerFeed } from './components/CarePartnerFeed';
import { PostComposer } from './components/PostComposer';
import { ClinicianDashboard } from './components/ClinicianDashboard';
import { KnowledgeBaseExplorer } from './components/KnowledgeBaseExplorer';
import { FloatingChatbotAssistant } from './components/FloatingChatbotAssistant';
import { InvitationModal } from './components/InvitationModal';
import { AuditLedgerModal } from './components/AuditLedgerModal';
import { NotificationsModal } from './components/NotificationsModal';
import { UpdatesPage } from './components/UpdatesPage';
import { CalendarPage } from './components/CalendarPage';
import { AuthScreens } from './components/AuthScreens';
import { CurrentUser, PersonaOption, CommunityGroup, DirectMessage, QueueItem } from './types';
import { api } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [allPersonas, setAllPersonas] = useState<PersonaOption[]>([]);
  const [cohorts, setCohorts] = useState<CommunityGroup[]>([]);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [pendingTriageCount, setPendingTriageCount] = useState<number>(0);
  const [pendingQueue, setPendingQueue] = useState<QueueItem[]>([]);
  const [notifications, setNotifications] = useState<DirectMessage[]>([]);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [feedResetKey, setFeedResetKey] = useState<number>(0);
  const [targetDiscussionId, setTargetDiscussionId] = useState<string | null>(null);

  // Auto-fade submission notice after 3.5 seconds
  useEffect(() => {
    if (!feedNotice) return;
    const timer = setTimeout(() => {
      setFeedNotice(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [feedNotice]);

  // Modals
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [inspectedResourceId, setInspectedResourceId] = useState<string | null>(null);
  const [composerInitialTitle, setComposerInitialTitle] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'forgot-password' | 'register'>('login');
  const [authInviteToken, setAuthInviteToken] = useState<string | undefined>(undefined);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Initial load
  const loadUserAndData = async (asUserId?: string) => {
    try {
      const userRes = await api.getCurrentUser(asUserId);
      setCurrentUser(userRes.user);
      setAllPersonas(userRes.allPersonas);

      // Respect URL parameters on initial cold load only
      if (!asUserId) {
        const searchParams = new URLSearchParams(window.location.search);
        const urlTab = searchParams.get('tab');
        const urlPost = searchParams.get('post');
        const tokenParam = searchParams.get('token') || (window.location.pathname.startsWith('/register') ? searchParams.get('token') : null);

        if (tokenParam) {
          setAuthInviteToken(tokenParam);
          setAuthMode('register');
          setIsAuthOpen(true);
        } else if (urlTab === 'login') {
          setAuthMode('login');
          setIsAuthOpen(true);
        } else if (urlTab === 'forgot-password' || urlTab === 'reset-password') {
          setAuthMode('forgot-password');
          setIsAuthOpen(true);
        } else if (urlPost) {
          setTargetDiscussionId(urlPost);
          setActiveTab('feed');
        } else if (urlTab) {
          setActiveTab(urlTab);
        } else if (userRes.user.role === 'CLINICIAN_MODERATOR' || userRes.user.role === 'SYSTEM_ADMIN') {
          setActiveTab('moderation');
        } else {
          setActiveTab('feed');
        }
      }

      const cohortsRes = await api.getCohorts({ userId: userRes.user.id, role: userRes.user.role });
      setCohorts(cohortsRes);

      const isStaffUser = userRes.user.role !== 'CARE_PARTNER';
      if (isStaffUser) {
        const queueRes = await api.getModerationQueue();
        setPendingTriageCount(queueRes.totalPending || 0);
        setPendingQueue(queueRes.items || []);
      } else {
        setPendingTriageCount(0);
        setPendingQueue([]);
      }

      const notifRes = await api.getNotifications(userRes.user.id);
      setNotifications(notifRes.messages || []);
    } catch (err) {
      console.error('Failed to bootstrap app data:', err);
    }
  };

  useEffect(() => {
    loadUserAndData();

    // Listen for browser back / forward navigation
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') || 'feed';
      const postParam = params.get('post') || null;
      const tokenParam = params.get('token');

      if (tokenParam) {
        setAuthInviteToken(tokenParam);
        setAuthMode('register');
        setIsAuthOpen(true);
      } else if (tabParam === 'login') {
        setAuthMode('login');
        setIsAuthOpen(true);
      } else if (tabParam === 'forgot-password') {
        setAuthMode('forgot-password');
        setIsAuthOpen(true);
      } else {
        setIsAuthOpen(false);
        setActiveTab(tabParam);
        setTargetDiscussionId(postParam);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLoginSuccess = async (user: CurrentUser) => {
    // 1. Immediately clean browser URL: set pathname to '/', remove ?token=..., set ?tab=nextTab
    const nextTab = user.role === 'CLINICIAN_MODERATOR' || user.role === 'SYSTEM_ADMIN' ? 'moderation' : 'feed';
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.searchParams.delete('token');
    url.searchParams.set('tab', nextTab);
    window.history.replaceState({ tab: nextTab }, '', url.toString());

    // 2. Clear auth modal state and update active user
    setAuthInviteToken(undefined);
    setIsAuthOpen(false);
    setCurrentUser(user);
    setActiveTab(nextTab);

    // 3. Load user's data without re-reading the old URL token
    await loadUserAndData(user.id);
  };

  const handleSignOut = () => {
    localStorage.removeItem('jh_user_id');
    localStorage.removeItem('jh_session_token');
    setCurrentUser(null);
    setAuthMode('login');
    setIsAuthOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'login');
    url.searchParams.delete('post');
    url.searchParams.delete('token');
    window.history.pushState({ tab: 'login' }, '', url.toString());
  };

  const handleSwitchPersona = (userId: string) => {
    loadUserAndData(userId);
    setFeedResetKey((prev) => prev + 1);
    setTargetDiscussionId(null);
    const targetPersona = allPersonas.find((p) => p.id === userId);
    let nextTab = 'feed';
    if (targetPersona?.role === 'CLINICIAN_MODERATOR' || targetPersona?.role === 'SYSTEM_ADMIN') {
      nextTab = 'moderation';
    }
    setActiveTab(nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', nextTab);
    url.searchParams.delete('post');
    window.history.pushState({ tab: nextTab, post: null }, '', url.toString());
  };


  const handleQueueUpdated = async () => {
    try {
      const isStaffUser = currentUser?.role !== 'CARE_PARTNER';
      if (isStaffUser) {
        const queueRes = await api.getModerationQueue();
        setPendingTriageCount(queueRes.totalPending || 0);
        setPendingQueue(queueRes.items || []);
      } else {
        setPendingTriageCount(0);
        setPendingQueue([]);
      }
      if (currentUser) {
        const notifRes = await api.getNotifications(currentUser.id);
        setNotifications(notifRes.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleOpenResourceFromDeflection = (resourceId: string) => {
    setInspectedResourceId(resourceId);
    setActiveTab('knowledge');
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'knowledge');
    url.searchParams.delete('post');
    window.history.pushState({ tab: 'knowledge', post: null }, '', url.toString());
  };

  if (isAuthOpen || !currentUser) {
    return (
      <AuthScreens
        initialMode={authMode}
        initialToken={authInviteToken}
        onLoginSuccess={handleLoginSuccess}
        onCancel={currentUser ? () => setIsAuthOpen(false) : undefined}
      />
    );
  }

  const handleSelectTab = (tab: string) => {
    if (tab === 'feed') {
      setFeedResetKey((prev) => prev + 1);
    }
    setActiveTab(tab);
    setTargetDiscussionId(null);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    url.searchParams.delete('post');
    window.history.pushState({ tab, post: null }, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F19] flex flex-col text-slate-800 dark:text-slate-100 font-sans selection:bg-[#002D72]/15 selection:text-[#002D72] dark:selection:bg-blue-600/30 dark:selection:text-blue-200 transition-colors">
      {/* Universal Top Header with Emergency Banner & Persona Switcher */}
      <Header
        currentUser={currentUser}
        allPersonas={allPersonas}
        onSwitchPersona={handleSwitchPersona}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        pendingTriageCount={pendingTriageCount}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-10 md:pb-12 xl:pb-8">
        {activeTab === 'feed' && (
          <CarePartnerFeed
            currentUser={currentUser}
            cohorts={cohorts}
            resetKey={feedResetKey}
            targetDiscussionId={targetDiscussionId}
            onClearTargetDiscussion={() => setTargetDiscussionId(null)}
            recentNotice={feedNotice}
            onDismissNotice={() => setFeedNotice(null)}
            onOpenComposer={() => setActiveTab('compose')}
          />
        )}

        {activeTab === 'compose' && (
          <PostComposer
            currentUser={currentUser}
            cohorts={cohorts}
            initialTitle={composerInitialTitle}
            onPostSubmitted={() => {
              setComposerInitialTitle('');
              setFeedNotice('Your question has been submitted and is currently being reviewed by Dr. Seema.');
              setActiveTab('feed');
              handleQueueUpdated();
            }}
            onCancel={() => {
              setComposerInitialTitle('');
              setActiveTab('feed');
            }}
            onOpenResource={handleOpenResourceFromDeflection}
            onOpenDiscussion={(postId) => {
              setComposerInitialTitle('');
              setTargetDiscussionId(postId);
              setActiveTab('feed');
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'feed');
              url.searchParams.set('post', postId);
              window.history.pushState({ tab: 'feed', post: postId }, '', url.toString());
            }}
          />
        )}

        {activeTab === 'moderation' && (
          <ClinicianDashboard
            currentUser={currentUser}
            cohorts={cohorts}
            onQueueUpdated={handleQueueUpdated}
            onOpenAudit={() => setIsAuditOpen(true)}
            onOpenInvite={() => setIsInviteOpen(true)}
            onCohortCreated={async () => {
              const res = await api.getCohorts({ userId: currentUser.id, role: currentUser.role });
              setCohorts(res);
            }}
            onOpenDiscussion={(postId) => {
              setTargetDiscussionId(postId);
              setActiveTab('feed');
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'feed');
              url.searchParams.set('post', postId);
              window.history.pushState({ tab: 'feed', post: postId }, '', url.toString());
            }}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseExplorer
            initialResourceId={inspectedResourceId}
            onClearInitialResource={() => setInspectedResourceId(null)}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'updates' && <UpdatesPage currentUser={currentUser} />}
        {activeTab === 'calendar' && <CalendarPage currentUser={currentUser} />}

        {activeTab === 'audit' && (
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-xs">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Audit Ledger
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Inspect logged clinical reviews, approvals, and redactions.
              </p>
              <button
                onClick={() => setIsAuditOpen(true)}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
              >
                Open Audit Ledger
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Official Institutional Footer */}
      <Footer />

      {/* PERSISTENT FLOATING CLINICAL CHATBOT (Circle button on every view + floating chat window) */}
      <FloatingChatbotAssistant
        currentUser={currentUser}
        isOpen={isAssistantOpen}
        onToggle={() => setIsAssistantOpen((prev) => !prev)}
        onClose={() => setIsAssistantOpen(false)}
      />

      <InvitationModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        cohorts={cohorts}
      />

      <AuditLedgerModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        currentUser={currentUser}
        notifications={notifications}
        pendingQueue={pendingQueue}
        onRefreshNotifications={() => currentUser && loadUserAndData(currentUser.id)}
        onQueueUpdated={handleQueueUpdated}
        onNavigateToConsole={() => setActiveTab('moderation')}
        onNavigateToFeed={() => setActiveTab('feed')}
      />


    </div>
  );
}
