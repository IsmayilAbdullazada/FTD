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
      <div className="space-y-2 select-text font-sans">
        {paragraphs.map((p, pIdx) => {
          const lines = p.split(/\n/);
          return (
            <p key={pIdx} className="leading-relaxed text-xs sm:text-[13px] text-slate-800 dark:text-slate-200">
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
    <div className="space-y-3 select-text text-xs sm:text-[13px] leading-relaxed font-sans">
      {rawSections.map((sec, secIdx) => {
        const trimmed = sec.trim();
        const headerMatch = trimmed.match(/^###\s+([^\n]+)/);
        const headerTitle = headerMatch ? headerMatch[1].trim() : '';
        const bodyContent = headerMatch ? trimmed.slice(headerMatch[0].length).trim() : trimmed;

        if (headerTitle.toLowerCase().includes('understanding') || headerTitle.toLowerCase().includes('happening')) {
          const paragraphs = bodyContent.split(/\n\n+/);
          return (
            <div key={secIdx} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#002D72] dark:text-sky-400">
                <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{headerTitle}</span>
              </div>
              <div className="space-y-1.5 text-slate-700 dark:text-slate-200 pl-0.5">
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
            <div key={secIdx} className="space-y-2 pt-0.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#002D72] dark:text-sky-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750/80 shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-[#002D72] dark:text-sky-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {stepNumber}
                      </span>
                      <div className="flex-1 text-slate-700 dark:text-slate-200 leading-snug">
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
              className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-amber-950 dark:text-amber-100 space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-amber-900 dark:text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{headerTitle}</span>
              </div>
              <ul className="space-y-1 text-[12px] text-amber-900/90 dark:text-amber-200/90">
                {bulletLines.map((bullet, bIdx) => {
                  const cleanedBullet = bullet.replace(/^[•\-\*]\s*/, '');
                  return (
                    <li key={bIdx} className="flex items-start gap-1.5 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0 mt-1.5" />
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hello. I'm Dr. Seema's Clinical Assistant for our Johns Hopkins Care Partner families.\n\nCaring for a loved one with Frontotemporal Dementia (FTD) is often exhausting, and it is completely normal to feel unsure of what to do. You can ask me any daily question—like what to do about bathing resistance, blunt remarks in public, driving safety, sweet cravings, or memory care planning.\n\nHow can I support you and your loved one today?`,
      timestamp: 'Now',
      suggestedQuestions: [
        'Why does my loved one make blunt or rude comments in public?',
        'How do I handle violent resistance during showers and bathing?',
        'How do I stop my loved one from driving safely?',
        'Why are they constantly craving sweets and overeating?',
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
          text: 'Unable to reach the clinical knowledge base right now. For clinical triage, please call the Johns Hopkins clinic line at (410) 955-5147 (option 2) or support line at (410) 502-4163. For life-threatening emergencies, call 911.',
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
        text: `Chat reset. I am here to help you with any caregiving questions or practical steps you need. How can I support you today?`,
        timestamp: 'Now',
        suggestedQuestions: [
          'Why does my loved one make blunt or rude comments in public?',
          'How do I handle violent resistance during showers and bathing?',
          'How do I stop my loved one from driving safely?',
          'Why are they constantly craving sweets and overeating?',
        ],
      },
    ]);
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. FLOATING CHATBOT TRIGGER BUTTON */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 right-4 sm:right-6 z-40 pointer-events-auto">
        <button
          ref={triggerRef}
          onClick={onToggle}
          type="button"
          aria-label={isOpen ? 'Close Care Assistant' : 'Open Care Assistant'}
          title={isOpen ? 'Close Care Assistant' : 'Ask Dr. Seema’s Clinical Assistant'}
          className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 ${
            isOpen
              ? 'bg-slate-800 dark:bg-slate-700 text-white'
              : 'bg-[#002D72] dark:bg-blue-600 text-white hover:bg-[#001D4A] dark:hover:bg-blue-500'
          }`}
        >
          {isOpen ? (
            <X className="w-5 h-5 transition-transform duration-200" />
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHATBOT FLOATING WINDOW */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div
          ref={windowRef}
          role="dialog"
          aria-label="Clinical Care Assistant"
          className="fixed bottom-[calc(8.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-21 right-4 sm:right-6 w-[305px] sm:w-[385px] max-w-[calc(100vw-1.5rem)] h-[430px] sm:h-[540px] max-h-[70vh] sm:max-h-[calc(100dvh-6.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 transition-colors"
        >
          {/* Header */}
          <div className="p-2.5 sm:p-3 bg-[#002D72] dark:bg-slate-900 text-white border-b border-blue-900/50 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-[#002D72] dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-serif font-bold text-xs shadow-xs">
                  SG
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border border-[#002D72] dark:border-slate-900 rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-serif font-semibold text-xs sm:text-sm text-white truncate">
                    Dr. Seema’s Assistant
                  </h2>
                  <span title="Verified Physician Knowledge" className="inline-flex items-center">
                    <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                  </span>
                </div>
                <p className="text-[10px] text-blue-200 dark:text-slate-400 truncate">
                  Care Partner Support · Johns Hopkins
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart chat"
                aria-label="Restart chat"
                className="p-1.5 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close assistant"
                aria-label="Close assistant"
                className="p-1.5 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* WARNING BANNER: Prominently displayed at the beginning of chat */}
          <div className="mx-2.5 sm:mx-3 mt-2.5 mb-1 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 text-xs shadow-2xs space-y-1.5 shrink-0">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-[11px] sm:text-[11.5px] leading-tight">
              <Phone className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>
                For a life-threatening emergency, call{' '}
                <a href="tel:911" className="underline font-black hover:text-rose-800 dark:hover:text-rose-200">
                  911
                </a>{' '}
                right away.
              </span>
            </div>
            <div className="text-[10.5px] sm:text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90 font-sans">
              <strong className="font-semibold block text-amber-950 dark:text-amber-100">
                This assistant is not for urgent messages
              </strong>
              This platform is not intended for urgent messages to your clinician. If you need to reach your clinician,
              please call your clinic at{' '}
              <a href="tel:4109555147" className="font-semibold underline">
                (410) 955-5147, option 2
              </a>{' '}
              or send a message through EPIC.
            </div>
          </div>

          {/* Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-3 text-sm min-h-0 bg-slate-50/70 dark:bg-slate-950">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[92%] sm:max-w-[90%] rounded-2xl p-3 leading-relaxed space-y-2 font-sans ${
                      isUser
                        ? 'bg-[#002D72] dark:bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : msg.isMedicationRefusal
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-950 dark:text-rose-100 rounded-bl-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {/* Message Body */}
                    {isUser ? (
                      <div className="whitespace-pre-line select-text text-xs sm:text-[13px] leading-relaxed font-sans">
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
                          className="inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Clinic: (410) 955-5147 (opt. 2)</span>
                        </a>
                        <a
                          href="tel:4105024163"
                          className="inline-flex items-center justify-center gap-1.5 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition border border-transparent dark:border-slate-700"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Support Line: (410) 502-4163</span>
                        </a>
                      </div>
                    )}

                    {/* Related Follow-Up Topics */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Related Topics:
                        </span>
                        <div className="flex flex-col gap-1">
                          {msg.suggestedQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSend(q)}
                              className="text-left text-xs bg-slate-50 dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-[#002D72] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 p-2 rounded-lg border border-slate-200/80 dark:border-slate-750 transition cursor-pointer flex items-center justify-between gap-1.5"
                            >
                              <span className="line-clamp-2 text-[11px] sm:text-[11.5px] leading-snug">{q}</span>
                              <ChevronRight className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-[9.5px] pt-0.5 ${
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
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-[85%] text-xs text-slate-500 dark:text-slate-400 shadow-2xs">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Searching Dr. Seema's clinical protocols...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Topic Starter Pills */}
          <div className="px-2.5 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto flex items-center gap-1 no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => handleSend('How do I handle bathing and shower resistance?')}
              className="text-[10px] sm:text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Bathing resistance
            </button>
            <button
              type="button"
              onClick={() => handleSend('Why does my spouse say rude things with no filter?')}
              className="text-[10px] sm:text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Blunt remarks
            </button>
            <button
              type="button"
              onClick={() => handleSend('How do I take away car keys safely without fighting?')}
              className="text-[10px] sm:text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Driving retirement
            </button>
            <button
              type="button"
              onClick={() => handleSend('Why are they constantly craving sweets and overeating?')}
              className="text-[10px] sm:text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
            >
              Sweet cravings
            </button>
          </div>

          {/* Chat Input Bar */}
          <div className="p-2 sm:p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask a clinical care question..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 font-sans"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="p-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 rounded-xl transition shrink-0 shadow-xs cursor-pointer"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[9px] sm:text-[9.5px] text-slate-400 dark:text-slate-500 pt-1 px-0.5">
              <span>Clinic: (410) 955-5147 opt. 2</span>
              <span>Crisis: 911</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

