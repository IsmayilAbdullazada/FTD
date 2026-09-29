import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CarePartnerFeed } from './components/CarePartnerFeed';
import { PostComposer } from './components/PostComposer';
import { ClinicianDashboard } from './components/ClinicianDashboard';
import { KnowledgeBaseExplorer } from './components/KnowledgeBaseExplorer';
import { CohortManagement } from './components/CohortManagement';
import { CaregiverMessages } from './components/CaregiverMessages';
import { RagAssistantModal } from './components/RagAssistantModal';
import { InvitationModal } from './components/InvitationModal';
import { AuditLedgerModal } from './components/AuditLedgerModal';
import { NotificationsModal } from './components/NotificationsModal';
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

  // Modals
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [inspectedResourceId, setInspectedResourceId] = useState<string | null>(null);

  // Initial load
  const loadUserAndData = async (asUserId?: string) => {
    try {
      const userRes = await api.getCurrentUser(asUserId);
      setCurrentUser(userRes.user);
      setAllPersonas(userRes.allPersonas);

      const cohortsRes = await api.getCohorts();
      setCohorts(cohortsRes);

      const queueRes = await api.getModerationQueue();
      setPendingTriageCount(queueRes.totalPending || 0);
      setPendingQueue(queueRes.items || []);

      const notifRes = await api.getNotifications(userRes.user.id);
      setNotifications(notifRes.messages || []);
    } catch (err) {
      console.error('Failed to bootstrap app data:', err);
    }
  };


  useEffect(() => {
    loadUserAndData();
  }, []);

  const handleSwitchPersona = (userId: string) => {
    loadUserAndData(userId);
    const targetPersona = allPersonas.find((p) => p.id === userId);
    if (targetPersona?.role === 'CLINICIAN_MODERATOR') {
      if (activeTab === 'compose' || activeTab === 'messages') {
        setActiveTab('moderation');
      }
    } else {
      if (activeTab === 'moderation') {
        setActiveTab('feed');
      }
    }
  };


  const handleQueueUpdated = async () => {
    try {
      const queueRes = await api.getModerationQueue();
      setPendingTriageCount(queueRes.totalPending || 0);
      setPendingQueue(queueRes.items || []);
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
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#002D72] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif font-bold text-[#002D72]">
          Connecting to Johns Hopkins FTD Platform...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col text-slate-800 font-sans selection:bg-[#002D72]/15 selection:text-[#002D72]">
      {/* Universal Top Header with Emergency Banner & Persona Switcher */}
      <Header
        currentUser={currentUser}
        allPersonas={allPersonas}
        onSwitchPersona={handleSwitchPersona}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingTriageCount={pendingTriageCount}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-12">
        {activeTab === 'feed' && (
          <CarePartnerFeed
            currentUser={currentUser}
            cohorts={cohorts}
            onOpenComposer={() => setActiveTab('compose')}
            onOpenAssistant={() => setIsAssistantOpen(true)}
          />
        )}

        {activeTab === 'compose' && (
          <PostComposer
            currentUser={currentUser}
            cohorts={cohorts}
            onPostSubmitted={() => {
              setActiveTab('feed');
              handleQueueUpdated();
            }}
            onCancel={() => setActiveTab('feed')}
            onOpenResource={handleOpenResourceFromDeflection}
          />
        )}

        {activeTab === 'moderation' && (
          <ClinicianDashboard
            cohorts={cohorts}
            onQueueUpdated={handleQueueUpdated}
            onOpenAudit={() => setIsAuditOpen(true)}
            onOpenInvite={() => setIsInviteOpen(true)}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseExplorer
            initialResourceId={inspectedResourceId}
            onClearInitialResource={() => setInspectedResourceId(null)}
            currentUser={currentUser}
          />
        )}


        {activeTab === 'messages' && (
          <CaregiverMessages currentUser={currentUser} />
        )}

        {activeTab === 'cohorts' && (
          <CohortManagement
            cohorts={cohorts}
            currentUser={currentUser}
            onCohortCreated={async () => {
              const res = await api.getCohorts();
              setCohorts(res);
            }}
          />
        )}

        {activeTab === 'audit' && (
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-900">
                Audit Ledger
              </h2>
              <p className="text-slate-500 text-xs">
                Inspect logged clinical reviews, approvals, and redactions.
              </p>
              <button
                onClick={() => setIsAuditOpen(true)}
                className="px-4 py-2 bg-[#002D72] text-white rounded-lg text-xs font-semibold"
              >
                Open Audit Ledger
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div>Johns Hopkins Medicine • Frontotemporal Dementia Clinic</div>
      </footer>

      {/* MODALS */}
      <RagAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onOpenResource={(resId) => {
          setIsAssistantOpen(false);
          setInspectedResourceId(resId);
          setActiveTab('knowledge');
        }}
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
        onOpenPrivateChatWithCaregiver={(_caregiverId) => setActiveTab('moderation')}
      />

    </div>
  );
}
