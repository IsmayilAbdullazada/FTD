import { PreviewBootstrap } from './components/PreviewBootstrap';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { Footer } from '@/app/components/Footer';
import { Header } from '@/app/components/Header';
import { SessionTimeoutModal } from '@/app/components/SessionTimeoutModal';
import { InvitationModal } from '@/features/invitations';
import { AuditLedgerModal } from '@/features/moderation';
import { NotificationsModal } from '@/features/notifications';
import { useAppController } from '@/app/hooks/useAppController';
import { GuidelinesGate } from '@/features/policies';
import { policiesApi } from '@/features/policies/api/policiesApi';
import { useFontSize } from "../features/accessibility/hooks/useFontSize";

const AdminConsole = lazy(() =>
  import('@/features/admin/components/AdminConsole').then((module) => ({
    default: module.AdminConsole,
  })),
);
const ClinicianDashboard = lazy(() =>
  import('@/features/clinician-workspace').then((module) => ({
    default: module.ClinicianDashboard,
  })),
);
const AuthScreens = lazy(() =>
  import('@/features/auth').then((module) => ({ default: module.AuthScreens })),
);
const CarePartnerFeed = lazy(() =>
  import('@/features/discussions').then((module) => ({
    default: module.CarePartnerFeed,
  })),
);
const PostComposer = lazy(() =>
  import('@/features/discussions').then((module) => ({
    default: module.PostComposer,
  })),
);
const KnowledgeBaseExplorer = lazy(() =>
  import('@/features/knowledge').then((module) => ({
    default: module.KnowledgeBaseExplorer,
  })),
);
const FloatingChatbotAssistant = lazy(() =>
  import('@/features/knowledge').then((module) => ({
    default: module.FloatingChatbotAssistant,
  })),
);
const UpdatesPage = lazy(() =>
  import('@/features/content').then((module) => ({
    default: module.UpdatesPage,
  })),
);
const CalendarPage = lazy(() =>
  import('@/features/content').then((module) => ({
    default: module.CalendarPage,
  })),
);

function AppContent() {
  const { state, actions } = useAppController();
  const [showGuidelines, setShowGuidelines] = useState(false);
  const { fontSize, setFontSize } = useFontSize();
  const {
    bootstrapError,
    currentUser,
    allPersonas,
    cohorts,
    activeTab,
    clinicianTab,
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
    loginSucceeded: controllerLoginSuccess,
    signOut: handleSignOut,
    switchPersona: handleSwitchPersona,
    queueUpdated: handleQueueUpdated,
    selectTab: handleSelectTab,
    openDiscussion: handleOpenDiscussion,
    openDiscussionFromComposer: handleOpenDiscussionFromComposer,
    openResource: handleOpenResourceFromDeflection,
  } = actions;

  const initialQueue = useMemo(
    () => ({ items: pendingQueue, totalPending: pendingTriageCount }),
    [pendingQueue, pendingTriageCount],
  );

  const handleLoginSuccess = controllerLoginSuccess;
  useEffect(() => {
    let cancelled = false;
    const carePartner = currentUser?.role === 'CARE_PARTNER';
    const requireAcknowledgment = () => {
      if (carePartner) setShowGuidelines(true);
    };
    window.addEventListener('jh:guidelines-required', requireAcknowledgment);
    if (carePartner)
      void policiesApi
        .getStatus()
        .then((status) => {
          if (!cancelled) setShowGuidelines(!status.acknowledged);
        })
        .catch(() => {
          if (!cancelled) setShowGuidelines(true);
        });
    return () => {
      cancelled = true;
      window.removeEventListener(
        'jh:guidelines-required',
        requireAcknowledgment,
      );
    };
  }, [currentUser?.id, currentUser?.role]);

  const staff =
    currentUser?.role === 'CLINICIAN_MODERATOR' ||
    currentUser?.role === 'SYSTEM_ADMIN';
  const bootstrapAlert = bootstrapError && (
    <div
      role="alert"
      className="mx-auto max-w-3xl m-4 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <p>Some application data could not be loaded. {bootstrapError}</p>
      <button
        type="button"
        className="mt-2 font-semibold underline"
        onClick={() => void actions.retryBootstrap()}
      >
        Retry loading
      </button>
    </div>
  );
  if (bootstrapError && !currentUser) return <main>{bootstrapAlert}</main>;
  if (isAuthOpen || !currentUser) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F19]" />
        }
      >
        <AuthScreens
          initialMode={authMode}
          initialToken={authInviteToken}
          onLoginSuccess={handleLoginSuccess}
          sessionNotice={sessionNotice}
          onCancel={currentUser ? actions.closeAuth : undefined}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0F19] flex flex-col text-slate-800 dark:text-slate-100 font-sans selection:bg-[#002D72]/15 selection:text-[#002D72] dark:selection:bg-blue-600/30 dark:selection:text-blue-200 transition-colors">
      {showGuidelines && currentUser.role === 'CARE_PARTNER' && (
        <GuidelinesGate
          key={currentUser.id}
          onContinue={() => setShowGuidelines(false)}
          onSignOut={() => {
            setShowGuidelines(false);
            handleSignOut();
          }}
        />
      )}
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
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
      />

      {bootstrapAlert}
      {/* Main Content Area */}
      <main className="flex-1 pb-10 md:pb-12 xl:pb-8">
        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Loading...
            </div>
          }
        >
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

          {activeTab === 'moderation' && staff && (
            <Suspense
              fallback={
                <div className="max-w-6xl mx-auto px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Loading dashboard...
                </div>
              }
            >
              <ClinicianDashboard
                initialQueue={initialQueue}
                currentUser={currentUser}
                cohorts={cohorts}
                activeTab={clinicianTab}
                onTabChange={actions.setClinicianTab}
                onQueueUpdated={handleQueueUpdated}
                onOpenAudit={actions.openAudit}
                onOpenInvite={actions.openInvite}
                onCohortCreated={actions.cohortCreated}
                onOpenDiscussion={handleOpenDiscussion}
              />
            </Suspense>
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeBaseExplorer
              initialResourceId={inspectedResourceId}
              onClearInitialResource={actions.clearInspectedResource}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'admin' &&
            currentUser.role === 'SYSTEM_ADMIN' &&
            currentUser.adminConsoleEnabled && <AdminConsole />}
          {activeTab === 'updates' && <UpdatesPage currentUser={currentUser} />}
          {activeTab === 'calendar' && (
            <CalendarPage currentUser={currentUser} />
          )}

          {activeTab === 'audit' && staff && (
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
        </Suspense>
      </main>

      {/* Official Institutional Footer */}
      <Footer />

      {/* PERSISTENT FLOATING CLINICAL CHATBOT (Circle button on every view + floating chat window) */}
      <Suspense fallback={null}>
        <FloatingChatbotAssistant
          currentUser={currentUser}
          isOpen={isAssistantOpen}
          prefillRequest={assistantPrefill}
          onToggle={actions.toggleAssistant}
          onClose={actions.closeAssistant}
          onCreateDiscussion={actions.createDiscussion}
          onOpenDiscussion={handleOpenDiscussion}
        />
      </Suspense>

      <InvitationModal
        isOpen={isInviteOpen}
        onClose={actions.closeInvite}
        cohorts={cohorts}
      />

      <AuditLedgerModal isOpen={isAuditOpen} onClose={actions.closeAudit} />

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
        onOpenDiscussion={handleOpenDiscussion}
        onOpenMyPosts={actions.openMyPosts}
      />

      {/* Inactivity detection & Session Timeout with 60s countdown warning */}
      <SessionTimeoutModal
        isAuthenticated={!!currentUser && !isAuthOpen}
        onTimeout={actions.sessionTimedOut}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PreviewBootstrap>
        <AppContent />
      </PreviewBootstrap>
    </ErrorBoundary>
  );
}
