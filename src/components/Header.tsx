import React, { useState } from 'react';
import {
  Phone,
  Bell,
  MessageSquare,
  BookOpen,
  Sparkles,
  Shield,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { CurrentUser, PersonaOption, DirectMessage } from '../types';

interface HeaderProps {
  currentUser: CurrentUser;
  allPersonas: PersonaOption[];
  onSwitchPersona: (userId: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingTriageCount: number;
  notifications: DirectMessage[];
  onOpenNotifications: () => void;
  onOpenAssistant: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  allPersonas,
  onSwitchPersona,
  activeTab,
  setActiveTab,
  pendingTriageCount,
  notifications,
  onOpenNotifications,
  onOpenAssistant,
}) => {
  const isClinician = currentUser.role === 'CLINICIAN_MODERATOR';
  const isAdmin = currentUser.role === 'SYSTEM_ADMIN';

  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const reviewAlertsCount = (isClinician || isAdmin) ? pendingTriageCount : 0;
  const totalNotificationBadge = unreadCount + reviewAlertsCount;

  return (
    <>
      {/* CLEAN, MINIMAL HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo & Platform Name */}
          <button
            onClick={() => setActiveTab('feed')}
            className="flex items-center gap-2 text-left"
          >
            <div className="w-7 h-7 rounded-md bg-[#002D72] flex items-center justify-center text-white font-bold text-xs tracking-wider shrink-0">
              JH
            </div>
            <div className="leading-tight">
              <span className="font-semibold text-slate-900 text-sm block">
                FTD Care Partner Circle
              </span>
              <span className="text-[11px] text-slate-500 block">
                Johns Hopkins Medicine
              </span>
            </div>
          </button>

          {/* Header Action Items */}
          <div className="flex items-center gap-2">
            {/* Direct Emergency Call Button */}
            <a
              href="tel:4105553832"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-[#002D72] hover:bg-slate-100 transition border border-slate-200"
              title="Call Clinic Support Line: (410) 555-FTDC"
            >
              <Phone className="w-3.5 h-3.5 text-[#002D72]" />
              <span className="hidden sm:inline">(410) 555-FTDC</span>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-1 text-xs">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'feed'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Discussions
              </button>
              <button
                onClick={() => setActiveTab('knowledge')}
                className={`px-3 py-1.5 rounded-lg transition font-medium ${
                  activeTab === 'knowledge'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Guides
              </button>
              <button
                onClick={onOpenAssistant}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Guide</span>
              </button>

              {/* Caregiver direct messages with Dr. Seema */}
              {!isClinician && !isAdmin && (
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1 ${
                    activeTab === 'messages'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dr. Seema Messages</span>
                </button>
              )}

              {/* Clinician Moderator Console */}
              {(isClinician || isAdmin) && (
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 ${
                    activeTab === 'moderation'
                      ? 'bg-[#002D72] text-white'
                      : 'text-[#002D72] bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Moderator Console</span>
                  {pendingTriageCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {pendingTriageCount}
                    </span>
                  )}
                </button>
              )}
            </nav>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Notifications"
              title={
                totalNotificationBadge > 0
                  ? `${totalNotificationBadge} pending alerts & reviews`
                  : 'Notifications'
              }
            >
              <Bell className="w-4 h-4" />
              {totalNotificationBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalNotificationBadge}
                </span>
              )}
            </button>

            {/* Persona Switcher / Profile */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition text-xs text-slate-700"
                title="Switch Profile / Demo User"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: currentUser.avatarColor || '#002D72' }}
                >
                  {currentUser.firstName[0]}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Current: {currentUser.role === 'CLINICIAN_MODERATOR' ? 'Dr. Seema (Moderator)' : currentUser.anonymousHandle}
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <div className="px-3 py-1 text-[11px] text-slate-500">
                    Switch Test Persona:
                  </div>
                  {allPersonas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSwitchPersona(p.id);
                        setShowPersonaMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between transition ${
                        p.id === currentUser.id ? 'font-semibold text-[#002D72] bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div>{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.handle}</div>
                      </div>
                      {p.id === currentUser.id && (
                        <span className="text-[10px] font-bold text-[#002D72]">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 safe-bottom">
        <div className="max-w-md mx-auto grid grid-cols-4 h-13 items-center text-center">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'feed' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Posts</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'knowledge' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Guides</span>
          </button>

          <button
            onClick={onOpenAssistant}
            className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-indigo-600 transition"
          >
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-[10px] mt-0.5 text-indigo-700 font-medium">AI Help</span>
          </button>

          <button
            onClick={() => {
              if (isClinician || isAdmin) {
                setActiveTab('moderation');
              } else {
                setActiveTab('messages');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 transition relative ${
              activeTab === 'moderation' || activeTab === 'messages'
                ? 'text-[#002D72] font-semibold'
                : 'text-slate-500'
            }`}
          >
            {isClinician || isAdmin ? (
              <>
                <Shield className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">Console</span>
                {pendingTriageCount > 0 && (
                  <span className="absolute top-1.5 right-6 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-[10px] mt-0.5">Messages</span>
              </>
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
