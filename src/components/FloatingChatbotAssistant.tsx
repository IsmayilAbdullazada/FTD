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
  MessageCircleHeart,
} from 'lucide-react';
import { api } from '../services/api';
import { CurrentUser } from '../types';

interface FloatingChatbotAssistantProps {
  currentUser?: CurrentUser | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCreateDiscussion: (draft: { title: string; content: string }) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isMedicationRefusal?: boolean;
  discussionDraft?: { title: string; content: string };
  discussions?: { id: string; title: string; url: string; replyCount: number }[];
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
  const conditionDescription = user?.condition === 'AD'
    ? "Alzheimer's disease (AD)"
    : user?.condition === 'FTD'
    ? 'Frontotemporal Dementia (FTD)'
    : null;
  const openingLine = conditionDescription
    ? `Hello! I am your Care Companion, here to support you as a care partner supporting a loved one with ${conditionDescription}.`
    : 'Hello! I am your Care Companion, here to support you as a care partner.';

  return {
    id: `msg-welcome-${Date.now()}`,
    sender: 'assistant',
    text: `${openingLine}\n\nI can find verified care guides and link you to the relevant pages. If no guide matches, I can help you prepare a discussion post.\n\nWhat is on your mind today?`,
    timestamp: 'Now',
  };
};

export const FloatingChatbotAssistant: React.FC<FloatingChatbotAssistantProps> = ({
  currentUser,
  isOpen,
  onToggle,
  onClose,
  onCreateDiscussion,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showUrgentNotice, setShowUrgentNotice] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hintDismissedRef = useRef(false);
  const wasOpenRef = useRef(isOpen);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(currentUser)]);

  // Introduce the companion once per session, without interrupting moderators.
  useEffect(() => {
    if (isOpen) {
      hintDismissedRef.current = true;
      setShowHint(false);
      try { sessionStorage.setItem('jh_companion_hint_dismissed', 'true'); } catch {}
      return;
    }
    if (currentUser?.role !== 'CARE_PARTNER') { setShowHint(false); return; }
    if (hintDismissedRef.current) return;
    try {
      if (sessionStorage.getItem('jh_companion_hint_dismissed')) return;
    } catch {}
    const timer = setTimeout(() => setShowHint(true), 1800);
    return () => clearTimeout(timer);
  }, [isOpen, currentUser?.role]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) triggerRef.current?.focus();
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => handleDismissHint(), 20000);
    return () => clearTimeout(timer);
  }, [showHint]);

  const handleDismissHint = () => {
    hintDismissedRef.current = true;
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
      if (event.key === 'Escape') {
        if (isOpen) onClose();
        else if (showHint) { handleDismissHint(); triggerRef.current?.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, showHint]);

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
        matchedGuide: res.matchedGuide,
        citedResources: res.citedResources,
        discussions: res.discussions,
        discussionDraft: res.discussionDraft || { title: '', content: q.trim() },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Care companion error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to search the guides right now. You can try again or create a discussion post.',
          discussionDraft: { title: '', content: q.trim() },
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
        {showHint && !isOpen && (
          <aside
            aria-label="Care Companion introduction"
            className="absolute bottom-full mb-3 right-0 w-[min(320px,calc(100vw-1.5rem))] rounded-2xl border border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-xl text-slate-800 dark:text-slate-100"
          >
            <button
              type="button"
              onClick={() => { handleDismissHint(); triggerRef.current?.focus(); }}
              title="Dismiss introduction"
              aria-label="Dismiss Care Companion introduction"
              className="absolute top-1 right-1 min-w-11 min-h-11 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <p className="pr-8 text-base font-semibold text-[#002D72] dark:text-sky-300">
              Have a caregiving question?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Ask Care Companion first. Find helpful guide pages and community discussions before starting a new post.
            </p>
            <button
              type="button"
              onClick={handleOpenFromHint}
              className="mt-3 min-h-11 inline-flex items-center gap-2 rounded-lg bg-[#002D72] dark:bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900 dark:hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Ask Care Companion <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <span aria-hidden="true" className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-blue-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
          </aside>
        )}

        <button
          ref={triggerRef}
          onClick={onToggle}
          type="button"
          aria-label={isOpen ? 'Close Care Companion' : 'Open Care Companion'}
          aria-expanded={isOpen}
          aria-controls="care-companion-dialog"
          title={isOpen ? 'Close Care Companion' : 'Ask Care Companion'}
          className={`relative min-h-14 inline-flex items-center justify-center gap-2.5 rounded-2xl shadow-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 dark:focus-visible:ring-blue-800 ${
            isOpen
              ? 'w-14 bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700'
              : 'pl-4 pr-5 bg-[#002D72] dark:bg-blue-600 text-white hover:bg-[#001D4A] dark:hover:bg-blue-500'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" aria-hidden="true" /> : (
            <>
              {showHint && <span aria-hidden="true" className="companion-attention absolute inset-0 rounded-2xl pointer-events-none" />}
              <MessageCircleHeart className="w-7 h-7 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-sm font-semibold whitespace-nowrap">Ask Care Companion</span>
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
          id="care-companion-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Care Companion (Johns Hopkins)"
          className="fixed inset-0 sm:inset-auto sm:bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] xl:bottom-24 sm:right-6 w-full sm:w-[420px] md:w-[440px] h-[100dvh] sm:h-[620px] sm:max-h-[calc(100dvh-10rem)] xl:max-h-[calc(100dvh-7.5rem)] bg-white dark:bg-slate-900 rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200/90 dark:border-slate-800 z-50 flex flex-col overflow-hidden animate-in fade-in duration-200 transition-colors"
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
                  <span title="Verified Care Knowledge" className="inline-flex items-center">
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
              title="Medical disclaimer"
            >
              {showUrgentNotice ? 'Hide' : 'Notice'}
            </button>
          </div>

          {showUrgentNotice && (
            <div className="p-3 bg-amber-100/90 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800/60 text-xs sm:text-sm leading-relaxed text-amber-950 dark:text-amber-100 shrink-0 animate-in fade-in duration-150">
              <strong className="font-semibold block">Not for emergency messages:</strong>
              This assistant finds relevant pages in approved care guides. It does not provide personalized medical advice.
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
                    ) : msg.text ? (
                      <FormattedMessageText text={msg.text} />
                    ) : null}

                    {/* Institutional Grounded Guide Citation */}
                    {!isUser && (msg.matchedGuide || (msg.citedResources && msg.citedResources.length > 0)) && (
                      <div className="pt-2.5 pb-0.5 space-y-1.5 text-xs">
                        <p className="text-base leading-relaxed text-slate-800 dark:text-slate-200">
                          You may find what you're looking for on these guide pages.
                        </p>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                          <FileText className="w-3.5 h-3.5 text-[#002D72] dark:text-sky-400 shrink-0" />
                          <span>Care Sources:</span>
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

                    {!!msg.discussions?.length && (
                      <div className="space-y-2">
                        <p className="text-base leading-relaxed text-slate-800 dark:text-slate-200">
                          You may also find helpful replies in these discussions.
                        </p>
                        {msg.discussions.map((discussion) => (
                          <a key={discussion.id} href={discussion.url}
                            className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-[#002D72] dark:text-sky-400 hover:underline">
                            <MessageSquare className="w-4 h-4 shrink-0" />
                            <span>{discussion.title} <span className="text-xs">({discussion.replyCount} {discussion.replyCount === 1 ? 'reply' : 'replies'})</span></span>
                          </a>
                        ))}
                      </div>
                    )}

                    {msg.discussionDraft && (msg.citedResources?.length || msg.matchedGuide || !!msg.discussions?.length) && (
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        Still haven't found what you need? Ask the community by creating a discussion post.
                      </p>
                    )}

                    {msg.discussionDraft && (
                      <a
                        href="?tab=compose"
                        onClick={(event) => {
                          event.preventDefault();
                          onCreateDiscussion(msg.discussionDraft!);
                        }}
                        className="inline-flex items-center gap-2 min-h-11 px-3 py-2 rounded-lg bg-[#002D72] text-white font-semibold text-sm hover:bg-[#001D4A]"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Create a discussion post
                      </a>
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

