import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  X,
  Phone,
  Sparkles,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Heart,
  CheckCircle2,
  FileText,
  ExternalLink,
  HeartHandshake,
} from 'lucide-react';
import { api } from '../services/api';
import { CurrentUser } from '../types';

interface FloatingChatbotAssistantProps {
  currentUser?: CurrentUser | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isMedicationRefusal?: boolean;
  suggestedQuestions?: string[];
  matchedGuide?: {
    id: string;
    title: string;
    fileName: string;
    page?: number;
    sectionTitle?: string;
  } | null;
  citedResources?: {
    id: string;
    title: string;
    fileName?: string;
    page?: number;
    url: string;
  }[];
  timestamp: string;
}

const FormattedMessageText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="select-text text-base leading-relaxed font-sans text-slate-800 dark:text-slate-200">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h3 className="font-serif font-bold text-lg text-[#002D72] dark:text-sky-400 mt-3 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-serif font-bold text-base text-[#002D72] dark:text-sky-400 mt-3 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="font-sans font-bold text-base text-[#002D72] dark:text-sky-400 mt-2.5 mb-1 first:mt-0">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5 className="font-sans font-semibold text-sm text-[#002D72] dark:text-sky-400 mt-2 mb-1 first:mt-0">
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed text-base text-slate-800 dark:text-slate-200">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 my-2.5 list-disc list-outside pl-5 text-base text-slate-800 dark:text-slate-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 my-2.5 list-decimal list-outside pl-5 text-base text-slate-800 dark:text-slate-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-base pl-0.5">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-800 dark:text-slate-200">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-[#002D72] dark:border-sky-400 pl-3 py-1 my-2 italic text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-r-lg">
              {children}
            </blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

const createWelcomeMessage = (user?: CurrentUser | null): ChatMessage => {
  const isAD = user?.condition === 'AD';

  const defaultSuggestedQuestions = isAD
    ? [
        'How to manage sundowning and evening confusion?',
        'Managing repetitive questions with calm reassurance?',
        'Communication strategies for progressive memory loss?',
        'Home safety modifications to prevent wandering?',
      ]
    : [
        'How to handle resistance during bathing?',
        'Why blunt or rude remarks happen in bvFTD?',
        'How to transition away from driving safely?',
        'Managing sweet cravings & overeating?',
      ];

  const conditionDescription = isAD
    ? "Alzheimer's and memory care"
    : "Frontotemporal Dementia (FTD)";

  return {
    id: `msg-welcome-${Date.now()}`,
    sender: 'assistant',
    text: `Hello! I am your Care Companion, here to support you 24/7 as a care partner supporting a loved one with ${conditionDescription}.\n\nI can help answer day-to-day caregiving questions based on verified Johns Hopkins clinical care guides, behavioral routines, and family resources.\n\nWhat is on your mind today?`,
    timestamp: 'Now',
    suggestedQuestions: defaultSuggestedQuestions,
  };
};

export const FloatingChatbotAssistant: React.FC<FloatingChatbotAssistantProps> = ({
  currentUser,
  isOpen,
  onToggle,
  onClose,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUrgentNotice, setShowUrgentNotice] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(currentUser)]);

  // Show gentle hint after 1.2s on page load if user hasn't dismissed it this session and chat is closed
  useEffect(() => {
    let timer: any;
    try {
      const dismissed = sessionStorage.getItem('jh_companion_hint_dismissed');
      if (!dismissed && !isOpen) {
        timer = setTimeout(() => {
          setShowHint(true);
        }, 1200);
      }
    } catch {
      if (!isOpen) {
        timer = setTimeout(() => setShowHint(true), 1200);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Dismiss hint when user opens the chat
  useEffect(() => {
    if (isOpen) {
      setShowHint(false);
    }
  }, [isOpen]);

  // Auto-dismiss hint after 20 seconds so it doesn't linger forever
  useEffect(() => {
    if (showHint) {
      const autoDismiss = setTimeout(() => {
        setShowHint(false);
      }, 20000);
      return () => clearTimeout(autoDismiss);
    }
  }, [showHint]);

  const handleDismissHint = () => {
    setShowHint(false);
    try {
      sessionStorage.setItem('jh_companion_hint_dismissed', 'true');
    } catch {}
  };

  const handleOpenFromHint = () => {
    handleDismissHint();
    if (!isOpen) {
      onToggle();
    }
  };

  // Reset conversation context when switching persona/condition
  useEffect(() => {
    setMessages([createWelcomeMessage(currentUser)]);
  }, [currentUser?.id, currentUser?.condition]);

  // Keyboard shortcut listener to close on Escape (removed click-outside to prevent accidental closures)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened on non-mobile devices
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined' && window.innerWidth >= 640) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
    }
  }, [isOpen]);

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q || !q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    const historyPayload = messages
      .filter((m) => m.id !== 'msg-welcome' && !m.id.startsWith('msg-welcome'))
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'assistant' ? 'assistant' : 'user',
        text: m.text,
      }));

    try {
      const res = await api.chatWithAssistant(
        q.trim(),
        currentUser?.id || 'anonymous',
        historyPayload
      );
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        isMedicationRefusal: res.isMedicationRefusal,
        suggestedQuestions: res.suggestedQuestions || [],
        matchedGuide: res.matchedGuide,
        citedResources: res.citedResources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Clinical assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to reach the clinical knowledge base right now. For clinical triage, please call the Johns Hopkins clinic line at (410) 955-5147 (option 2) or support line at (410) 502-4163. For emergencies, call 911.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([createWelcomeMessage(currentUser)]);
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. FLOATING CHATBOT TRIGGER BUTTON & HINT CALLOUT */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] xl:bottom-6 right-3 sm:right-6 z-40 pointer-events-auto flex items-end justify-end">
        {/* Friendly Inactivity / First-Visit Hint Speech Bubble */}
        {showHint && !isOpen && (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-16 right-0 sm:bottom-1 sm:right-16 sm:mr-3 w-[270px] sm:w-[290px] bg-white dark:bg-slate-900 border border-blue-200/90 dark:border-blue-900/80 rounded-2xl shadow-2xl p-3.5 text-slate-800 dark:text-slate-100 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div
                onClick={handleOpenFromHint}
                className="flex-1 cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 text-[#002D72] dark:text-sky-400 font-semibold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500 animate-pulse" />
                  <span>Care Companion</span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-[#002D72] dark:group-hover:text-sky-300 transition-colors">
                  Have a question on your mind?
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  I'm here to help 24/7 with caregiving routines, behavioral tips, and answers.
                </p>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#002D72] dark:text-sky-400 group-hover:underline">
                  <span>Ask a question</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismissHint();
                }}
                title="Dismiss hint"
                aria-label="Dismiss hint"
                className="w-6 h-6 -mr-1 -mt-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speech bubble pointer arrow */}
            {/* Desktop: arrow points right to button */}
            <div className="hidden sm:block absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-l-8 border-l-white dark:border-l-slate-900" />
            {/* Mobile: arrow points down to button */}
            <div className="sm:hidden absolute -bottom-2 right-6 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-white dark:border-t-slate-900" />
          </div>
        )}

        <button
          ref={triggerRef}
          onClick={onToggle}
          type="button"
          aria-label={isOpen ? 'Close Care Companion' : 'Open Care Companion'}
          title={isOpen ? 'Close Care Companion' : 'Open Care Companion · 24/7 Support'}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 ${
            isOpen
              ? 'bg-slate-800 dark:bg-slate-700 text-white'
              : 'bg-[#002D72] dark:bg-blue-600 text-white hover:bg-[#001D4A] dark:hover:bg-blue-500'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-200" />
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
                <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1.5 -right-1.5 animate-pulse" />
              </div>
              <span className="absolute top-1 right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHATBOT WINDOW (Full-screen mobile, balanced flyout desktop) */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div
          ref={windowRef}
          role="dialog"
          aria-modal="true"
          aria-label="Care Companion (Johns Hopkins)"
          className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 w-full sm:w-[420px] md:w-[440px] h-[100dvh] sm:h-[620px] sm:max-h-[calc(100dvh-7.5rem)] bg-white dark:bg-slate-900 rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200/90 dark:border-slate-800 z-50 flex flex-col overflow-hidden animate-in fade-in duration-200 transition-colors"
        >
          {/* Header - Care Companion */}
          <div className="px-4 py-3 sm:px-4 sm:py-3.5 bg-[#002D72] dark:bg-slate-900 text-white border-b border-blue-900/50 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-[#002D72] dark:text-sky-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center shadow-xs">
                  <HeartHandshake className="w-5 h-5 text-[#002D72] dark:text-sky-300" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#002D72] dark:border-slate-900 rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-serif font-bold text-sm sm:text-base text-white truncate">
                    Care Companion
                  </h2>
                  <span title="Verified Clinical Knowledge" className="inline-flex items-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  </span>
                </div>
                <p className="text-xs text-blue-200 dark:text-slate-400 truncate">
                  24/7 Educational Guidance · Johns Hopkins
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart chat"
                aria-label="Restart chat"
                className="min-w-10 min-h-10 flex items-center justify-center text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close assistant"
                aria-label="Close assistant"
                className="min-w-10 min-h-10 flex items-center justify-center text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* EMERGENCY BANNER: 12-14px readable emergency strip */}
          <div className="px-3.5 py-2 sm:px-4 sm:py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-xs sm:text-sm text-amber-950 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <Phone className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="truncate">
                Emergency: <a href="tel:911" className="font-bold underline text-rose-700 dark:text-rose-400 hover:text-rose-800">911</a> · Clinic: <a href="tel:4109555147" className="font-semibold underline">(410) 955-5147</a>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUrgentNotice((prev) => !prev)}
              className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline shrink-0 ml-1.5 cursor-pointer"
              title="Clinical disclaimer"
            >
              {showUrgentNotice ? 'Hide' : 'Notice'}
            </button>
          </div>

          {showUrgentNotice && (
            <div className="p-3 bg-amber-100/90 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800/60 text-xs sm:text-sm leading-relaxed text-amber-950 dark:text-amber-100 shrink-0 animate-in fade-in duration-150">
              <strong className="font-semibold block">Not for emergency messages:</strong>
              This AI assistant provides educational guidance based on Johns Hopkins care guides. For emergencies, message through EPIC or dial 911 directly.
            </div>
          )}

          {/* Chat Message Stream */}
          <div
            role="log"
            aria-live="polite"
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 min-h-0 bg-slate-50/70 dark:bg-slate-950"
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-3 sm:p-3.5 leading-relaxed space-y-2 font-sans ${
                      isUser
                        ? 'bg-[#002D72] dark:bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : msg.isMedicationRefusal
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-950 dark:text-rose-100 rounded-bl-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {/* Message Body */}
                    {isUser ? (
                      <div className="whitespace-pre-line select-text text-base leading-relaxed font-sans">
                        {msg.text}
                      </div>
                    ) : (
                      <FormattedMessageText text={msg.text} />
                    )}

                    {/* Medication Refusal Emergency Contacts */}
                    {msg.isMedicationRefusal && (
                      <div className="pt-2 flex flex-col gap-2">
                        <a
                          href="tel:4109555147"
                          className="min-h-11 inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-2 rounded-xl text-sm transition"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Clinic: (410) 955-5147 (opt. 2)</span>
                        </a>
                        <a
                          href="tel:4105024163"
                          className="min-h-11 inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold px-3 py-2 rounded-xl text-sm transition"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Support Line: (410) 502-4163</span>
                        </a>
                      </div>
                    )}

                    {/* Institutional Grounded Guide Citation */}
                    {!isUser && (msg.matchedGuide || (msg.citedResources && msg.citedResources.length > 0)) && (
                      <div className="pt-2.5 pb-0.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                          <FileText className="w-3.5 h-3.5 text-[#002D72] dark:text-sky-400 shrink-0" />
                          <span>Clinical Sources:</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {(msg.citedResources && msg.citedResources.length > 0
                            ? msg.citedResources
                            : msg.matchedGuide
                            ? [{
                                id: msg.matchedGuide.id,
                                title: msg.matchedGuide.title,
                                fileName: msg.matchedGuide.fileName,
                                page: msg.matchedGuide.page,
                                url: `/resources/${msg.matchedGuide.fileName}${msg.matchedGuide.page ? `#page=${msg.matchedGuide.page}` : ''}`,
                              }]
                            : []
                          ).map((res, cIdx) => (
                            <div key={`${res.id || 'res'}-p${res.page ?? ''}-${cIdx}`} className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 px-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                              <span className="truncate text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                                <span className="font-semibold text-[#002D72] dark:text-sky-300 mr-1.5">[{cIdx + 1}]</span>
                                {res.title}
                                {res.page ? ` (Page ${res.page})` : ''}
                              </span>
                              {res.url && (
                                <a
                                  href={res.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[#002D72] dark:text-sky-400 hover:underline shrink-0 font-semibold text-xs ml-1"
                                  title="Open institutional guide PDF at page"
                                >
                                  <span>PDF</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related Follow-Up Topics */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Suggested Questions:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {msg.suggestedQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSend(q)}
                              className="text-left text-sm bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#002D72] dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 p-2.5 sm:p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70 transition cursor-pointer flex items-center justify-between gap-2 leading-snug group min-h-11"
                            >
                              <span className="line-clamp-2">{q}</span>
                              <ChevronRight className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-[#002D72] dark:group-hover:text-blue-300 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-xs pt-1 ${
                        isUser ? 'text-blue-200 text-right' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-[85%] text-xs sm:text-sm text-slate-600 dark:text-slate-300 shadow-2xs">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Searching care protocols...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Topic Starter Pills */}
          <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => handleSend('How do I de-escalate aggressive outbursts or agitation?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Aggression & agitation
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I handle sudden incontinence and toileting resistance?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Incontinence routine
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I handle severe apathy and lack of motivation?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Apathy & motivation
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I manage night wakefulness, sleep issues, and wandering?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Sleep & night pacing
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I manage compulsive behaviors and rituals?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Compulsive rituals
            </button>
            <button
              type="button"
              onClick={() => handleSend('What should family care partners know about hospice and comfort care in FTD?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Hospice & comfort care
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I handle bathing and shower resistance?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Bathing resistance
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I handle driving retirement safely?')}
              className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer min-h-9"
            >
              Driving retirement
            </button>
          </div>

          {/* Chat Input Bar - 16px text-base (iOS zoom protection) + 48px target */}
          <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask caregiving question..."
                className="flex-1 h-12 px-3.5 sm:px-4 text-base rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 font-sans"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="w-12 h-12 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 rounded-xl transition shrink-0 flex items-center justify-center shadow-xs cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-1 px-1">
              <span>Johns Hopkins Care Companion</span>
              <span>Crisis: <a href="tel:911" className="underline hover:text-rose-600 font-semibold">911</a></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

