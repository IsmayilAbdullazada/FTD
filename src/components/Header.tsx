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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 lg:gap-4 flex-nowrap">
          {/* LEFT: Institutional Logo + Standard Left-Aligned Desktop Navigation */}
          <div className="flex items-center gap-2.5 lg:gap-5 min-w-0 shrink-0">
            {/* Branding */}
            <button
              onClick={() => setActiveTab(isClinician || isAdmin ? 'moderation' : 'feed')}
              className="flex items-center gap-2.5 text-left group shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-[#002D72] flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-2xs group-hover:bg-blue-900 transition shrink-0">
                JH
              </div>
              <div className="leading-tight shrink-0">
                <span className="font-semibold text-slate-900 text-sm tracking-tight whitespace-nowrap block">
                  FTD Care Partner Circle
                </span>
                <span className="hidden 2xl:block text-[11px] text-slate-500 font-normal">
                  Johns Hopkins Medicine
                </span>
              </div>
            </button>

            {/* Subtle Divider between brand and nav on large screens */}
            <div className="hidden xl:block h-5 w-px bg-slate-200 shrink-0" />

            {/* Standard Desktop Navigation Links (Clean, left-aligned, spacious and legible) */}
            <nav className="hidden md:flex items-center gap-1 xl:gap-1.5 shrink-0">
              {/* Clinician / CS Admin Dashboard */}
              {(isClinician || isAdmin) && (
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                    activeTab === 'moderation'
                      ? 'bg-blue-50 text-[#002D72] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Dashboard</span>
                  {pendingTriageCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[11px] font-bold tabular-nums shrink-0">
                      {pendingTriageCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('feed')}
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  activeTab === 'feed'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Discussions</span>
              </button>

              <button
                onClick={() => setActiveTab('knowledge')}
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  activeTab === 'knowledge'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Guides</span>
              </button>

              <button
                onClick={onOpenAssistant}
                className="px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Assistant</span>
              </button>
            </nav>
          </div>

          {/* RIGHT: Quick Clinic Contact, Notification Center & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Direct Clinic Support Line: pill on wide desktop, compact icon on laptop */}
            <a
              href="tel:4105553832"
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-[#002D72] hover:bg-slate-50 transition border border-slate-200 shrink-0 whitespace-nowrap"
              title="Johns Hopkins FTD Caregiver Support Line: (410) 555-FTDC"
            >
              <Phone className="w-3.5 h-3.5 text-[#002D72] shrink-0" />
              <span className="text-slate-500">Clinic:</span>
              <span className="text-[#002D72] font-semibold">(410) 555-FTDC</span>
            </a>

            <a
              href="tel:4105553832"
              className="hidden sm:flex 2xl:hidden items-center justify-center p-2 rounded-lg text-slate-600 hover:text-[#002D72] hover:bg-slate-50 transition border border-slate-200 shrink-0"
              title="Call Clinic Support Line: (410) 555-FTDC"
              aria-label="Call Clinic Support Line"
            >
              <Phone className="w-4 h-4 text-[#002D72]" />
            </a>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0"
              aria-label="Notifications"
              title={
                totalNotificationBadge > 0
                  ? `${totalNotificationBadge} notifications`
                  : 'Notifications'
              }
            >
              <Bell className="w-5 h-5" />
              {totalNotificationBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-[#002D72] text-white text-[11px] font-bold rounded-full flex items-center justify-center tabular-nums">
                  {totalNotificationBadge}
                </span>
              )}
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

            {/* User Profile & Persona Switcher */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2 p-1 sm:px-2 py-1.5 rounded-lg hover:bg-slate-100 transition text-sm border border-transparent hover:border-slate-200 shrink-0"
                title="Switch persona or test account"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: currentUser.avatarColor || '#002D72' }}
                >
                  {currentUser.firstName[0]}
                </div>

                <div className="hidden lg:block text-left leading-tight shrink-0">
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm whitespace-nowrap truncate max-w-[100px] xl:max-w-[140px]">
                    {isAdmin
                      ? 'CS Admin'
                      : isClinician
                      ? 'Dr. Seema'
                      : `${currentUser.firstName} ${currentUser.lastName[0]}.`}
                  </div>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                      {isAdmin
                        ? 'System Administrator (JHU CS Lead)'
                        : isClinician
                        ? 'Dr. Seema Gulyani (Clinician Moderator)'
                        : currentUser.anonymousHandle}
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
                              {p.role === 'SYSTEM_ADMIN'
                                ? 'System Administrator'
                                : p.role === 'CLINICIAN_MODERATOR'
                                ? 'Clinician Moderator'
                                : p.handle}
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
              <div className="relative">
                <Shield className="w-5 h-5" />
                {pendingTriageCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 px-1 min-w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white tabular-nums">
                    {pendingTriageCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium mt-1 truncate max-w-full px-1">Dashboard</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'feed' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1 truncate max-w-full px-1">Discussions</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'knowledge' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] font-medium mt-1 truncate max-w-full px-1">Guides</span>
          </button>

          <button
            onClick={onOpenAssistant}
            className="flex flex-col items-center justify-center py-1.5 text-slate-500 hover:text-indigo-600 transition"
          >
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span className="text-[11px] font-medium mt-1 text-indigo-700 truncate max-w-full px-1">Assistant</span>
          </button>
        </div>
      </nav>
    </>
  );
};
