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
import { SessionTimeoutModal } from './components/SessionTimeoutModal';
import { useAppController } from './features/app/useAppController';

export default function App() {
  const { state, actions } = useAppController();
  const {
    currentUser,
    allPersonas,
    cohorts,
    activeTab,
    pendingTriageCount,
    pendingQueue,
    notifications,
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
  } = state;
  const {
    loginSucceeded: handleLoginSuccess,
    signOut: handleSignOut,
    switchPersona: handleSwitchPersona,
    queueUpdated: handleQueueUpdated,
    selectTab: handleSelectTab,
    openDiscussion: handleOpenDiscussion,
    openDiscussionFromComposer: handleOpenDiscussionFromComposer,
    openResource: handleOpenResourceFromDeflection,
  } = actions;

  if (isAuthOpen || !currentUser) {
    return (
      <AuthScreens
        initialMode={authMode}
        initialToken={authInviteToken}
        onLoginSuccess={handleLoginSuccess}
        sessionNotice={sessionNotice}
        onCancel={currentUser ? actions.closeAuth : undefined}
      />
    );
  }

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
        onOpenNotifications={actions.openNotifications}
        onOpenMyPosts={actions.openMyPosts}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-10 md:pb-12 xl:pb-8">
        {activeTab === 'feed' && (
          <CarePartnerFeed
            currentUser={currentUser}
            cohorts={cohorts}
            resetKey={feedResetKey}
            targetDiscussionId={targetDiscussionId}
            onClearTargetDiscussion={actions.clearTargetDiscussion}
            recentNotice={feedNotice}
            onDismissNotice={actions.dismissFeedNotice}
            onOpenComposer={actions.openComposer}
            initialSection={feedSection}
            onSectionChange={actions.changeFeedSection}
          />
        )}

        {activeTab === 'compose' && (
          <PostComposer
            currentUser={currentUser}
            cohorts={cohorts}
            initialTitle={composerInitialTitle}
            initialContent={composerInitialContent}
            onOpenAssistant={actions.openAssistant}
            onPostSubmitted={actions.postSubmitted}
            onCancel={actions.cancelComposer}
            onOpenResource={handleOpenResourceFromDeflection}
            onOpenDiscussion={handleOpenDiscussionFromComposer}
          />
        )}

        {activeTab === 'moderation' && (
          <ClinicianDashboard
            currentUser={currentUser}
            cohorts={cohorts}
            onQueueUpdated={handleQueueUpdated}
            onOpenAudit={actions.openAudit}
            onOpenInvite={actions.openInvite}
            onCohortCreated={actions.cohortCreated}
            onOpenDiscussion={handleOpenDiscussion}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseExplorer
            initialResourceId={inspectedResourceId}
            onClearInitialResource={actions.clearInspectedResource}
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
                onClick={actions.openAudit}
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
        prefillRequest={assistantPrefill}
        onToggle={actions.toggleAssistant}
        onClose={actions.closeAssistant}
        onCreateDiscussion={actions.createDiscussion}
      />

      <InvitationModal
        isOpen={isInviteOpen}
        onClose={actions.closeInvite}
        cohorts={cohorts}
      />

      <AuditLedgerModal
        isOpen={isAuditOpen}
        onClose={actions.closeAudit}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={actions.closeNotifications}
        currentUser={currentUser}
        notifications={notifications}
        pendingQueue={pendingQueue}
        onRefreshNotifications={actions.refreshNotifications}
        onQueueUpdated={handleQueueUpdated}
        onNavigateToConsole={actions.navigateToConsole}
        onNavigateToFeed={actions.navigateToFeed}
      />

      {/* Inactivity detection & Session Timeout with 60s countdown warning */}
      <SessionTimeoutModal
        isAuthenticated={!!currentUser && !isAuthOpen}
        onTimeout={actions.sessionTimedOut}
      />
    </div>
  );
}
