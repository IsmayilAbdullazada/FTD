import React, { useState } from 'react';
import {
  Shield,
  MessageSquare,
  BookOpen,
  Sparkles,
  Bell,
  Phone,
  ChevronDown,
  Check,
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
  const reviewAlertsCount = isClinician || isAdmin ? pendingTriageCount : 0;
  const totalNotificationBadge = unreadCount + reviewAlertsCount;

  return (
    <>
      {/* MODERN MINIMALIST NAVBAR (Standard Laptop Layout + Preserved Mobile/Tablet) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* LEFT: Institutional Logo + Standard Left-Aligned Desktop Navigation */}
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Branding */}
            <button
              onClick={() => setActiveTab(isClinician || isAdmin ? 'moderation' : 'feed')}
              className="flex items-center gap-3 text-left group shrink-0"
            >
              <div className="w-9 h-9 rounded-lg bg-[#002D72] flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-2xs group-hover:bg-blue-900 transition">
                JH
              </div>
              <div className="leading-tight">
                <span className="font-semibold text-slate-900 text-sm sm:text-[15px] tracking-tight block">
                  FTD Care Partner Circle
                </span>
                <span className="text-xs text-slate-500 block font-normal mt-0.5">
                  Johns Hopkins Medicine
                </span>
              </div>
            </button>

            {/* Subtle Divider between brand and nav on laptop */}
            <div className="hidden md:block h-6 w-px bg-slate-200" />

            {/* Standard Desktop Navigation Links (Clean, left-aligned, spacious and legible) */}
            <nav className="hidden md:flex items-center gap-1.5">
              {/* Clinician Dashboard */}
              {(isClinician || isAdmin) && (
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                    activeTab === 'moderation'
                      ? 'bg-blue-50 text-[#002D72] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Dashboard</span>
                  {pendingTriageCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                      {pendingTriageCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('feed')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                  activeTab === 'feed'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Discussions</span>
              </button>

              <button
                onClick={() => setActiveTab('knowledge')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                  activeTab === 'knowledge'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Guides</span>
              </button>

              <button
                onClick={onOpenAssistant}
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2 transition"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Assistant</span>
              </button>
            </nav>
          </div>

          {/* RIGHT: Quick Clinic Contact, Notification Center & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct Clinic Support Line */}
            <a
              href="tel:4105553832"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:text-[#002D72] hover:bg-slate-50 transition border border-slate-200"
              title="Johns Hopkins FTD Caregiver Support Line"
            >
              <Phone className="w-4 h-4 text-[#002D72]" />
              <span className="hidden lg:inline text-slate-500">Clinic Line:</span>
              <span className="text-[#002D72] font-semibold">(410) 555-FTDC</span>
            </a>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              aria-label="Notifications"
              title={
                totalNotificationBadge > 0
                  ? `${totalNotificationBadge} notifications`
                  : 'Notifications'
              }
            >
              <Bell className="w-5 h-5" />
              {totalNotificationBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-[#002D72] text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {totalNotificationBadge}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile & Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2.5 p-1 sm:px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition text-sm border border-transparent hover:border-slate-200"
                title="Switch persona or test account"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: currentUser.avatarColor || '#002D72' }}
                >
                  {currentUser.firstName[0]}
                </div>

                <div className="hidden lg:block text-left leading-tight">
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                    {currentUser.firstName} {currentUser.lastName}
                  </div>
                  <div className="text-xs text-slate-500 font-normal">
                    {isClinician ? 'Clinician Moderator' : 'Care Partner'}
                  </div>
                </div>

                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-76 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Current Active User
                    </div>
                    <div className="font-semibold text-slate-900 text-sm mt-0.5">
                      {currentUser.firstName} {currentUser.lastName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {isClinician ? 'Dr. Seema Gulyani (Clinician Moderator)' : currentUser.anonymousHandle}
                    </div>
                  </div>

                  <div className="px-3.5 pt-2.5 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Test Persona:
                  </div>

                  <div className="space-y-1 px-1.5 pb-1">
                    {allPersonas.map((p) => {
                      const isCurrent = p.id === currentUser.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSwitchPersona(p.id);
                            setShowPersonaMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left rounded-lg transition flex items-center justify-between ${
                            isCurrent
                              ? 'bg-blue-50 text-[#002D72] font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="text-xs sm:text-sm font-semibold">{p.name}</div>
                            <div className="text-xs text-slate-400">
                              {p.role === 'CLINICIAN_MODERATOR' ? 'Clinician Moderator' : p.handle}
                            </div>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-[#002D72]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Exact previous responsive mobile/tablet layout preserved) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-bottom">
        <div
          className={`max-w-md mx-auto grid ${
            isClinician || isAdmin ? 'grid-cols-4' : 'grid-cols-3'
          } h-15 items-center text-center`}
        >
          {(isClinician || isAdmin) && (
            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex flex-col items-center justify-center py-1.5 transition relative ${
                activeTab === 'moderation' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[11px] font-medium mt-1">Dashboard</span>
              {pendingTriageCount > 0 && (
                <span className="absolute top-1.5 right-6 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'feed' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Discussions</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'knowledge' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1">Guides</span>
          </button>

          <button
            onClick={onOpenAssistant}
            className="flex flex-col items-center justify-center py-1.5 text-slate-500 hover:text-indigo-600 transition"
          >
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-[11px] font-medium mt-1 text-indigo-700">Assistant</span>
          </button>
        </div>
      </nav>
    </>
  );
};
