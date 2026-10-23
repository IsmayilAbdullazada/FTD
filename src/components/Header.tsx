import React, { useState } from 'react';
import {
  Shield,
  MessageSquare,
  BookOpen,
  Bell,
  Phone,
  ChevronDown,
  Check,
  Stethoscope,
  CalendarDays,
  Sun,
  Moon,
  Plus,
  X,
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
}) => {
  const { theme, toggleTheme } = useTheme();
  const isClinician = currentUser.role === 'CLINICIAN_MODERATOR';
  const isAdmin = currentUser.role === 'SYSTEM_ADMIN';

  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const reviewAlertsCount = isClinician || isAdmin ? pendingTriageCount : 0;
  const totalNotificationBadge = unreadCount + reviewAlertsCount;

  return (
    <>
      {/* MODERN MINIMALIST NAVBAR (Responsive on Mobile, Tablet & Desktop) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors w-full">
        <div className="w-full px-2 sm:px-3 md:px-4 lg:px-4 xl:px-5 h-16 flex items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 flex-nowrap">
          {/* LEFT: Institutional Logo + Standard Left-Aligned Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3.5 min-w-0">
            {/* Branding - Responsive title avoids mobile & tablet overflow */}
            <button
              onClick={() => setActiveTab(isClinician || isAdmin ? 'moderation' : 'feed')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group shrink-0 cursor-pointer"
              title="Hopkins Care Partner Connect"
            >
              <img
                src="/website_logo.png"
                alt="Hopkins Care Partner Connect"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="leading-tight shrink-0">
                <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight whitespace-nowrap block">
                  <span className="sm:hidden">Hopkins Connect</span>
                  <span className="hidden sm:inline">Hopkins Care Partner Connect</span>
                </span>
                <span className="hidden 2xl:block text-xs text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap">
                  Johns Hopkins Medicine
                </span>
              </div>
            </button>

            {/* Subtle Divider between brand and nav on large desktop screens */}
            <div className="hidden xl:block h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            {/* Standard Desktop Navigation Links (>= 1280px only; Mobile & Tablet portrait/landscape use bottom bar) */}
            <nav className="hidden xl:flex items-center gap-1 xl:gap-1.5 shrink-0">
              {/* Clinician / CS Admin Dashboard */}
              {(isClinician || isAdmin) && (
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`px-2.5 lg:px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer min-h-11 ${
                    activeTab === 'moderation'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Dashboard</span>
                  {pendingTriageCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold tabular-nums shrink-0">
                      {pendingTriageCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('feed')}
                className={`px-2.5 lg:px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer min-h-11 ${
                  activeTab === 'feed'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Discussions</span>
              </button>

              <button
                onClick={() => setActiveTab('knowledge')}
                className={`px-2.5 lg:px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer min-h-11 ${
                  activeTab === 'knowledge'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Guides</span>
              </button>

              <button 
                onClick={() => setActiveTab('updates')} 
                className={`px-2.5 lg:px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer min-h-11 ${
                  activeTab === 'updates'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                <span>Updates</span>
              </button>

              <button 
                onClick={() => setActiveTab('calendar')} 
                className={`px-2.5 lg:px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer min-h-11 ${
                  activeTab === 'calendar'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>Events</span>
              </button>
            </nav>
          </div>

          {/* RIGHT: Quick Clinic Contact, Theme Toggle, Notification Center & User Profile */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0 z-10 relative">
            {/* Direct Clinic Phone Contact Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowCallMenu(!showCallMenu)}
                className="min-h-11 px-2.5 sm:px-3 flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#002D72] dark:text-sky-300 bg-blue-50/80 hover:bg-blue-100/90 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition cursor-pointer"
                aria-label="Direct Clinic Contact & Support Lines"
                aria-expanded={showCallMenu}
                title="Direct Clinic & Support Phone Numbers"
              >
                <Phone className="w-4 h-4 text-[#002D72] dark:text-sky-400 shrink-0" />
                <span className="hidden sm:inline">Call Clinic</span>
              </button>

              {/* Call Directory Modal Dialog (Accessible & Non-overflowing on Mobile View) */}
              {showCallMenu && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-150"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Direct Clinic Phone Lines"
                >
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs"
                    onClick={() => setShowCallMenu(false)}
                  />

                  {/* Modal Window Container */}
                  <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 z-10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
                    <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                            Direct Clinic Lines
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                            Mon–Fri 8:30–5 ET
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Johns Hopkins FTD &amp; Memory Care Center
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCallMenu(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer min-w-8 min-h-8 flex items-center justify-center"
                        aria-label="Close dialog"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mt-3.5 space-y-2.5">
                      {/* Clinic Appointment & Nursing Line */}
                      <a
                        href="tel:4109555147"
                        className="min-h-12 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#002D72] dark:hover:border-sky-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#002D72] dark:text-sky-400 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                              Main Clinic Line (Option 2)
                            </div>
                            <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#002D72] dark:group-hover:text-sky-400 transition break-all">
                              (410) 955-5147
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 px-3 py-1 bg-[#002D72] dark:bg-sky-600 text-white text-xs font-semibold rounded-lg shadow-2xs">
                          Call
                        </span>
                      </a>

                      {/* Care Partner Support Coordinator */}
                      <a
                        href="tel:4105024163"
                        className="min-h-12 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-600 dark:hover:border-emerald-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                              Care Partner Support Line
                            </div>
                            <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition break-all">
                              (410) 502-4163
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 px-3 py-1 bg-emerald-700 dark:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-2xs">
                          Call
                        </span>
                      </a>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2 leading-relaxed bg-rose-50/70 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/50">
                      <span className="font-bold shrink-0">Emergency:</span>
                      <span className="flex-1">
                        If you or your loved one are facing immediate danger or medical crisis, call{' '}
                        <a href="tel:911" className="font-bold underline text-rose-700 dark:text-rose-300">
                          911
                        </a>{' '}
                        or go to the nearest emergency department.
                      </span>
                    </div>

                    <div className="mt-3.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCallMenu(false)}
                        className="min-h-11 px-5 py-2 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* DARK / LIGHT MODE TOGGLE BUTTON (44px min tap target) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-11 h-11 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Notification Bell (44px min tap target) */}
            <button
              onClick={onOpenNotifications}
              className="relative w-11 h-11 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              aria-label="Notifications"
              title={
                totalNotificationBadge > 0
                  ? `${totalNotificationBadge} notifications`
                  : 'Notifications'
              }
            >
              <Bell className="w-5 h-5" />
              {totalNotificationBadge > 0 && (
                <span className="absolute top-1 right-1 min-w-5 h-5 px-1.5 bg-[#002D72] dark:bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center tabular-nums ring-2 ring-white dark:ring-slate-900">
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

                <div className="hidden 2xl:block text-left leading-tight shrink-0">
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
                                  : `${p.handle} · ${p.condition ?? ''}`}
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

      {/* MOBILE & TABLET BOTTOM NAVIGATION BAR (Covers Mobile, Portrait Tablet & Landscape Tablet < 1280px) */}
      <nav className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.5)] safe-bottom transition-colors">
        <div className="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-between h-16 px-1 sm:px-3 lg:px-6 relative">
          {/* Left Navigation Group (Discussions & Guides, plus Dashboard if Clinician) */}
          <div className="flex-1 flex items-center justify-around min-w-0">
            {(isClinician || isAdmin) && (
              <button
                onClick={() => setActiveTab('moderation')}
                className={`flex flex-col items-center justify-center py-1.5 transition relative cursor-pointer min-w-0 flex-1 min-h-12 ${
                  activeTab === 'moderation' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  <Shield className="w-5 h-5" />
                  {pendingTriageCount > 0 && (
                    <span className="absolute -top-1 -right-2 px-1 min-w-4 h-4 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 tabular-nums">
                      {pendingTriageCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium mt-0.5 truncate max-w-full px-0.5">Dashboard</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('feed')}
              className={`flex flex-col items-center justify-center py-1.5 transition cursor-pointer min-w-0 flex-1 min-h-12 ${
                activeTab === 'feed' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-xs font-medium mt-0.5 truncate max-w-full px-0.5">Discussions</span>
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex flex-col items-center justify-center py-1.5 transition cursor-pointer min-w-0 flex-1 min-h-12 ${
                activeTab === 'knowledge' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-medium mt-0.5 truncate max-w-full px-0.5">Guides</span>
            </button>
          </div>

          {/* Centered Raised '+' Action Button (Larger & Raised Outside Upper Bound of Tray) */}
          <div className="shrink-0 px-2 sm:px-4 flex flex-col items-center justify-center relative">
            <button
              type="button"
              onClick={() => setActiveTab('compose')}
              aria-label="New Post"
              title="Create New Post"
              className={`-mt-7.5 w-15 h-15 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 shadow-[0_10px_25px_rgba(0,45,114,0.35)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.7)] active:scale-90 hover:scale-105 transition-all duration-200 cursor-pointer ${
                activeTab === 'compose'
                  ? 'bg-blue-600 dark:bg-blue-500 ring-4 ring-blue-300 dark:ring-blue-600 shadow-[0_10px_25px_rgba(37,99,235,0.45)]'
                  : 'bg-[#002D72] hover:bg-[#001D4A] dark:bg-blue-600 dark:hover:bg-blue-500'
              }`}
            >
              <Plus className="w-8 h-8 stroke-[2.75]" />
            </button>
          </div>

          {/* Right Navigation Group (Updates & Events) */}
          <div className="flex-1 flex items-center justify-around min-w-0">
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex flex-col items-center justify-center py-1.5 transition cursor-pointer min-w-0 flex-1 min-h-12 ${
                activeTab === 'updates' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              <span className="text-xs font-medium mt-0.5 truncate max-w-full px-0.5">Updates</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center justify-center py-1.5 transition cursor-pointer min-w-0 flex-1 min-h-12 ${
                activeTab === 'calendar' ? 'text-[#002D72] dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-xs font-medium mt-0.5 truncate max-w-full px-0.5">Events</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};
