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
  Stethoscope,
  CalendarDays,
  Sun,
  Moon,
} from 'lucide-react';
import { CurrentUser, PersonaOption, DirectMessage } from '../types';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();
  const isClinician = currentUser.role === 'CLINICIAN_MODERATOR';
  const isAdmin = currentUser.role === 'SYSTEM_ADMIN';

  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const reviewAlertsCount = isClinician || isAdmin ? pendingTriageCount : 0;
  const totalNotificationBadge = unreadCount + reviewAlertsCount;

  return (
    <>
      {/* MODERN MINIMALIST NAVBAR (Responsive on Mobile, Tablet & Desktop) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 flex-nowrap">
          {/* LEFT: Institutional Logo + Standard Left-Aligned Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
            {/* Branding - Responsive title avoids mobile & tablet overflow */}
            <button
              onClick={() => setActiveTab(isClinician || isAdmin ? 'moderation' : 'feed')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group shrink-0 cursor-pointer min-w-0"
              title="Hopkins Care Partner Connect"
            >
              <img
                src="/website_logo.png"
                alt="Hopkins Care Partner Connect"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="leading-tight min-w-0">
                <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight truncate block">
                  <span className="sm:hidden">Hopkins Connect</span>
                  <span className="hidden sm:inline xl:hidden">Care Partner Connect</span>
                  <span className="hidden xl:inline">Hopkins Care Partner Connect</span>
                </span>
                <span className="hidden 2xl:block text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                  Johns Hopkins Medicine
                </span>
              </div>
            </button>

            {/* Subtle Divider between brand and nav on large screens */}
            <div className="hidden xl:block h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            {/* Standard Desktop & Tablet Navigation Links */}
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1.5 shrink-0">
              {/* Clinician / CS Admin Dashboard */}
              {(isClinician || isAdmin) && (
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`px-2 lg:px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === 'moderation'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                  <span>Dashboard</span>
                  {pendingTriageCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] lg:text-[11px] font-bold tabular-nums shrink-0">
                      {pendingTriageCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('feed')}
                className={`px-2 lg:px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>Discussions</span>
              </button>

              <button
                onClick={() => setActiveTab('knowledge')}
                className={`px-2 lg:px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'knowledge'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                <span>Guides</span>
              </button>

              <button 
                onClick={() => setActiveTab('updates')} 
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  activeTab === 'updates'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                <span>Updates</span>
              </button>

              <button 
                onClick={() => setActiveTab('calendar')} 
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  activeTab === 'calendar'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>Events</span>
              </button>

              <button
                onClick={onOpenAssistant}
                className="px-2 lg:px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Assistant</span>
              </button>
            </nav>
          </div>

          {/* RIGHT: Quick Clinic Contact, Theme Toggle, Notification Center & User Profile */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Direct Clinic Support Line: shown on extra-wide laptop/desktop */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0 whitespace-nowrap">
              <Phone className="w-3.5 h-3.5 text-[#002D72] dark:text-sky-400 shrink-0" />
              <div className="flex items-center gap-1.5">
                <a
                  href="tel:4109555147"
                  className="hover:text-[#002D72] dark:hover:text-sky-400 transition"
                  title="Hopkins Clinic: (410) 955-5147, option 2"
                >
                  <span className="text-slate-500 dark:text-slate-400">Clinic: </span>
                  <span className="text-[#002D72] dark:text-sky-400 font-semibold">(410) 955-5147</span>
                </a>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <a
                  href="tel:4105024163"
                  className="hover:text-emerald-700 dark:hover:text-emerald-400 transition"
                  title="Care Partner Support Line: (410) 502-4163"
                >
                  <span className="text-slate-500 dark:text-slate-400">Support: </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">(410) 502-4163</span>
                </a>
              </div>
            </div>

            {/* DARK / LIGHT MODE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              aria-label="Notifications"
              title={
                totalNotificationBadge > 0
                  ? `${totalNotificationBadge} notifications`
                  : 'Notifications'
              }
            >
              <Bell className="w-4 h-4" />
              {totalNotificationBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#002D72] dark:bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums ring-1 ring-white dark:ring-slate-900">
                  {totalNotificationBadge}
                </span>
              )}
            </button>

            {/* User Profile & Persona Switcher */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0 cursor-pointer"
                title="Switch persona or appearance"
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-2xs"
                  style={{ backgroundColor: currentUser.avatarColor || '#002D72' }}
                >
                  {currentUser.firstName[0]}
                </div>

                <div className="hidden xl:block text-left leading-tight shrink-0">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm whitespace-nowrap truncate max-w-[120px]">
                    {isAdmin
                      ? 'CS Admin'
                      : isClinician
                      ? 'Dr. Seema'
                      : `${currentUser.firstName} ${currentUser.lastName[0]}.`}
                  </div>
                </div>

                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showPersonaMenu && (
                <>
                  {/* Click outside backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowPersonaMenu(false)}
                  />

                  <div className="absolute right-0 mt-2 w-72 sm:w-76 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
                    {/* Current Active User */}
                    <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Current Active User
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm mt-0.5 truncate">
                        {currentUser.firstName} {currentUser.lastName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {isAdmin
                          ? 'System Administrator (JHU CS Lead)'
                          : isClinician
                          ? 'Dr. Seema Gulyani (Clinician Moderator)'
                          : currentUser.anonymousHandle}
                      </div>
                    </div>

                    {/* Dedicated Appearance / Theme Switcher in the Dropdown */}
                    <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {theme === 'dark' ? (
                          <Moon className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>Appearance</span>
                      </div>

                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            if (theme !== 'light') toggleTheme();
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                          title="Light Mode"
                        >
                          <Sun className="w-3 h-3 text-amber-500" />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (theme !== 'dark') toggleTheme();
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-slate-700 text-white shadow-2xs font-semibold'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                          title="Dark Mode"
                        >
                          <Moon className="w-3 h-3 text-blue-400" />
                          <span>Dark</span>
                        </button>
                      </div>
                    </div>

                    {/* Switch Test Persona Section */}
                    <div className="px-3.5 pt-2 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
                            className={`w-full px-3 py-2 text-left rounded-lg transition flex items-center justify-between cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-400 font-semibold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-semibold">{p.name}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">
                                {p.role === 'SYSTEM_ADMIN'
                                  ? 'System Administrator'
                                  : p.role === 'CLINICIAN_MODERATOR'
                                  ? 'Clinician Moderator'
                                  : p.handle}
                              </div>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-[#002D72] dark:text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Exact previous responsive mobile/tablet layout preserved + dark mode) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 safe-bottom transition-colors">
        <div
          className={`max-w-lg mx-auto grid ${
            isClinician || isAdmin ? 'grid-cols-6' : 'grid-cols-5'
            } h-15 items-center text-center`}
        >
          {(isClinician || isAdmin) && (
            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex flex-col items-center justify-center py-1.5 transition relative cursor-pointer ${
                activeTab === 'moderation' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="relative">
                <Shield className="w-5 h-5" />
                {pendingTriageCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 px-1 min-w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 tabular-nums">
                    {pendingTriageCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-1 truncate max-w-full px-1">Dashboard</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center py-1.5 transition cursor-pointer ${
              activeTab === 'feed' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1 truncate max-w-full px-1">Discussions</span>
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex flex-col items-center justify-center py-1.5 transition cursor-pointer ${
              activeTab === 'knowledge' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1 truncate max-w-full px-1">Guides</span>
          </button>

          <button
            onClick={() => setActiveTab('updates')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'updates' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <Stethoscope className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1 truncate max-w-full px-1">Updates</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center py-1.5 transition ${
              activeTab === 'calendar' ? 'text-[#002D72] font-semibold' : 'text-slate-500'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1 truncate max-w-full px-1">Events</span>
          </button>

          <button
            onClick={onOpenAssistant}
            className="flex flex-col items-center justify-center py-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] font-medium mt-1 text-indigo-700 dark:text-indigo-400 truncate max-w-full px-1">Assistant</span>
          </button>
        </div>
      </nav>
    </>
  );
};
