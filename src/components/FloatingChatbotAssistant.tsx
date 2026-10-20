import React, { useState, useEffect, useRef } from 'react';
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
  timestamp: string;
}

const renderInlineFormatted = (rawText: string) => {
  const parts = rawText.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={idx} className="italic text-slate-800 dark:text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
};

const FormattedMessageText: React.FC<{ text: string }> = ({ text }) => {
  const hasMarkdownSections = text.includes('###');

  if (!hasMarkdownSections) {
    const paragraphs = text.split(/\n\n+/);
    return (
      <div className="space-y-1.5 select-text font-sans">
        {paragraphs.map((p, pIdx) => {
          const lines = p.split(/\n/);
          return (
            <p key={pIdx} className="leading-relaxed text-xs sm:text-[12.5px] text-slate-800 dark:text-slate-200">
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {lIdx > 0 && <br />}
                  {renderInlineFormatted(line)}
                </React.Fragment>
              ))}
            </p>
          );
        })}
      </div>
    );
  }

  const rawSections = text.split(/(?=###\s+)/g).filter((s) => s.trim().length > 0);

  return (
    <div className="space-y-2.5 select-text text-xs sm:text-[12.5px] leading-relaxed font-sans">
      {rawSections.map((sec, secIdx) => {
        const trimmed = sec.trim();
        const headerMatch = trimmed.match(/^###\s+([^\n]+)/);
        const headerTitle = headerMatch ? headerMatch[1].trim() : '';
        const bodyContent = headerMatch ? trimmed.slice(headerMatch[0].length).trim() : trimmed;

        if (headerTitle.toLowerCase().includes('understanding') || headerTitle.toLowerCase().includes('happening')) {
          const paragraphs = bodyContent.split(/\n\n+/);
          return (
            <div key={secIdx} className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#002D72] dark:text-sky-400">
                <Heart className="w-3 h-3 text-rose-500 shrink-0" />
                <span>{headerTitle}</span>
              </div>
              <div className="space-y-1 text-slate-700 dark:text-slate-200 pl-0.5">
                {paragraphs.map((para, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">
                    {renderInlineFormatted(para)}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        if (headerTitle.toLowerCase().includes('practical') || headerTitle.toLowerCase().includes('steps')) {
          const stepBlocks = bodyContent.split(/\n(?=\d+\.\s+)/).map((s) => s.trim()).filter(Boolean);

          return (
            <div key={secIdx} className="space-y-1.5 pt-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#002D72] dark:text-sky-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{headerTitle}</span>
              </div>
              <div className="space-y-1.5">
                {stepBlocks.map((step, sIdx) => {
                  const numMatch = step.match(/^(\d+)\.\s*(.*)$/s);
                  const stepNumber = numMatch ? numMatch[1] : `${sIdx + 1}`;
                  const stepText = numMatch ? numMatch[2] : step;

                  return (
                    <div
                      key={sIdx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-750/70"
                    >
                      <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-[#002D72] dark:text-sky-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {stepNumber}
                      </span>
                      <div className="flex-1 text-slate-700 dark:text-slate-200 text-xs leading-snug">
                        {renderInlineFormatted(stepText)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (
          headerTitle.toLowerCase().includes('reminder') ||
          headerTitle.toLowerCase().includes('mind') ||
          headerTitle.toLowerCase().includes('takeaway')
        ) {
          const bulletLines = bodyContent
            .split(/\n/)
            .map((b) => b.trim())
            .filter((b) => b.length > 0);

          return (
            <div
              key={secIdx}
              className="p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-amber-950 dark:text-amber-100 space-y-1"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-300">
                <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{headerTitle}</span>
              </div>
              <ul className="space-y-1 text-[11.5px] text-amber-900/90 dark:text-amber-200/90">
                {bulletLines.map((bullet, bIdx) => {
                  const cleanedBullet = bullet.replace(/^[•\-\*]\s*/, '');
                  return (
                    <li key={bIdx} className="flex items-start gap-1.5 leading-snug">
                      <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0 mt-1.5" />
                      <span>{renderInlineFormatted(cleanedBullet)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }

        return (
          <div key={secIdx} className="space-y-1">
            {headerTitle && (
              <h4 className="font-semibold text-xs text-[#002D72] dark:text-sky-400">
                {headerTitle}
              </h4>
            )}
            <div className="text-slate-700 dark:text-slate-200">
              {renderInlineFormatted(bodyContent)}
            </div>
          </div>
        );
      })}
    </div>
  );
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hello! I'm Dr. Seema's Clinical Assistant for Johns Hopkins care partners.\n\nYou can ask me daily caregiving questions—like managing bathing resistance, blunt remarks, driving retirement, sweet cravings, or memory care planning.\n\nHow can I support you today?`,
      timestamp: 'Now',
      suggestedQuestions: [
        'How to handle resistance during bathing?',
        'Why blunt or rude remarks happen in bvFTD?',
        'How to transition away from driving safely?',
        'Managing sweet cravings & overeating?',
      ],
    },
  ]);

  // Click-outside listener & escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      if (
        windowRef.current &&
        !windowRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

    try {
      const res = await api.chatWithAssistant(q.trim(), currentUser?.id || 'anonymous');
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        isMedicationRefusal: res.isMedicationRefusal,
        suggestedQuestions: res.suggestedQuestions || [],
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
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat reset. I am here to help you with caregiving questions or practical steps. How can I support you today?`,
        timestamp: 'Now',
        suggestedQuestions: [
          'How to handle resistance during bathing?',
          'Why blunt or rude remarks happen in bvFTD?',
          'How to transition away from driving safely?',
          'Managing sweet cravings & overeating?',
        ],
      },
    ]);
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. FLOATING CHATBOT TRIGGER BUTTON */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-3 sm:right-6 z-40 pointer-events-auto">
        <button
          ref={triggerRef}
          onClick={onToggle}
          type="button"
          aria-label={isOpen ? 'Close Care Assistant' : 'Open Care Assistant'}
          title={isOpen ? 'Close Care Assistant' : 'Ask Dr. Seema’s Clinical Assistant'}
          className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 ${
            isOpen
              ? 'bg-slate-800 dark:bg-slate-700 text-white'
              : 'bg-[#002D72] dark:bg-blue-600 text-white hover:bg-[#001D4A] dark:hover:bg-blue-500'
          }`}
        >
          {isOpen ? (
            <X className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200" />
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <span className="absolute top-0.5 right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHATBOT FLOATING WINDOW (Compact on mobile, balanced on desktop) */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div
          ref={windowRef}
          role="dialog"
          aria-label="Clinical Care Assistant"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+3rem)] sm:bottom-20 right-3 sm:right-6 w-[min(300px,calc(100vw-1.5rem))] sm:w-[350px] md:w-[360px] max-w-[300px] sm:max-w-[360px] h-[340px] sm:h-[480px] max-h-[calc(100dvh-8rem)] sm:max-h-[calc(100dvh-6.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 transition-colors"
        >
          {/* Header - Compact & refined */}
          <div className="px-2.5 py-1.5 sm:px-3.5 sm:py-2.5 bg-[#002D72] dark:bg-slate-900 text-white border-b border-blue-900/50 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="relative shrink-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-[#002D72] dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-serif font-bold text-[10px] sm:text-xs shadow-xs">
                  SG
                </div>
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 border border-[#002D72] dark:border-slate-900 rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="font-serif font-semibold text-[11.5px] sm:text-sm text-white truncate">
                    Dr. Seema’s Assistant
                  </h2>
                  <span title="Verified Clinical Knowledge" className="inline-flex items-center">
                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-blue-200 dark:text-slate-400 truncate">
                  Care Partner Support · Johns Hopkins
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart chat"
                aria-label="Restart chat"
                className="p-1 sm:p-1.5 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close assistant"
                aria-label="Close assistant"
                className="p-1 sm:p-1.5 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          {/* EMERGENCY BANNER: Slim emergency strip with expandable details */}
          <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-[10px] sm:text-[11px] text-amber-950 dark:text-amber-200 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="truncate text-[10px] sm:text-[11px]">
                Emergency: <a href="tel:911" className="font-bold underline text-rose-700 dark:text-rose-400 hover:text-rose-800">911</a> · Clinic: <a href="tel:4109555147" className="font-semibold underline">(410) 955-5147</a>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowUrgentNotice((prev) => !prev)}
              className="text-[9px] sm:text-[9.5px] font-medium text-amber-800 dark:text-amber-300 hover:underline shrink-0 ml-1 cursor-pointer"
              title="Clinical disclaimer"
            >
              {showUrgentNotice ? 'Hide' : 'Notice'}
            </button>
          </div>

          {showUrgentNotice && (
            <div className="p-2 bg-amber-100/90 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800/60 text-[10px] leading-snug text-amber-950 dark:text-amber-100 shrink-0 animate-in fade-in duration-150">
              <strong className="font-semibold block">Not for urgent messages:</strong>
              Provides educational guidance only. For emergencies, message in EPIC or call clinic line directly.
            </div>
          )}

          {/* Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 text-[11.5px] sm:text-[12.5px] min-h-0 bg-slate-50/70 dark:bg-slate-950">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-2 sm:p-2.5 leading-relaxed space-y-1.5 font-sans ${
                      isUser
                        ? 'bg-[#002D72] dark:bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : msg.isMedicationRefusal
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-950 dark:text-rose-100 rounded-bl-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {/* Message Body */}
                    {isUser ? (
                      <div className="whitespace-pre-line select-text text-[11.5px] sm:text-[12.5px] leading-relaxed font-sans">
                        {msg.text}
                      </div>
                    ) : (
                      <FormattedMessageText text={msg.text} />
                    )}

                    {/* Medication Refusal Emergency Contacts */}
                    {msg.isMedicationRefusal && (
                      <div className="pt-1.5 flex flex-col gap-1.5">
                        <a
                          href="tel:4109555147"
                          className="inline-flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-medium px-2 py-1 rounded-lg text-[10.5px] sm:text-xs transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Clinic: (410) 955-5147 (opt. 2)</span>
                        </a>
                        <a
                          href="tel:4105024163"
                          className="inline-flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white font-medium px-2 py-1 rounded-lg text-[10.5px] sm:text-xs transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Support Line: (410) 502-4163</span>
                        </a>
                      </div>
                    )}

                    {/* Related Follow-Up Topics */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Suggested Questions:
                        </span>
                        <div className="flex flex-col gap-1">
                          {msg.suggestedQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSend(q)}
                              className="text-left text-[10.5px] sm:text-[11px] bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-[#002D72] dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 p-1 px-1.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70 transition cursor-pointer flex items-center justify-between gap-1 leading-snug group"
                            >
                              <span className="line-clamp-2">{q}</span>
                              <ChevronRight className="w-3 h-3 shrink-0 text-slate-400 group-hover:text-[#002D72] dark:group-hover:text-blue-300 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-[8.5px] sm:text-[9px] pt-0.5 ${
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
              <div className="flex items-center gap-1.5 p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-[85%] text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 shadow-2xs">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Searching care protocols...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Topic Starter Pills */}
          <div className="px-2 py-1 sm:px-2.5 sm:py-1.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto flex items-center gap-1 no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => handleSend('How do I handle bathing and shower resistance?')}
              className="text-[9.5px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Bathing resistance
            </button>
            <button
              type="button"
              onClick={() => handleSend('Why does my loved one make blunt remarks with no filter?')}
              className="text-[9.5px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Blunt remarks
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I handle driving retirement safely?')}
              className="text-[9.5px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Driving retirement
            </button>
            <button
              type="button"
              onClick={() => handleSend('How to manage compulsive sweet cravings and overeating?')}
              className="text-[9.5px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 hover:text-[#002D72] dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Sweet cravings
            </button>
          </div>

          {/* Chat Input Bar - Streamlined, ergonomic & uncluttered */}
          <div className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1 sm:gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask caregiving question..."
                className="flex-1 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-[13px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 font-sans"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 rounded-xl transition shrink-0 flex items-center justify-center shadow-xs cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[8.5px] sm:text-[9px] text-slate-400 dark:text-slate-500 pt-0.5 px-0.5">
              <span>Hopkins Care Partner Connect</span>
              <span>Crisis: <a href="tel:911" className="underline hover:text-rose-600">911</a></span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

