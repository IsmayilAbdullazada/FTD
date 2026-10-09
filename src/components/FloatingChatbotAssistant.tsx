import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Phone,
  BookOpen,
  Sparkles,
  Search,
  ChevronDown,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Minus,
} from 'lucide-react';
import { api } from '../services/api';
import { CLINICAL_50_FAQ, ClinicalFaqItem } from '../data/clinicalRagFaq';

interface FloatingChatbotAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenResource: (resourceId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isMedicationRefusal?: boolean;
  citedResources?: { id: string; title: string; url?: string }[];
  matchedFaq?: ClinicalFaqItem;
  suggestedQuestions?: string[];
  timestamp: string;
}

const FAQ_CATEGORIES = [
  { id: 'ALL', label: 'All 50 FAQs' },
  { id: 'BEHAVIORAL_DISINHIBITION', label: 'Disinhibition' },
  { id: 'HYGIENE_BATHING', label: 'Bathing & Care' },
  { id: 'WANDERING_SAFETY', label: 'Wandering' },
  { id: 'DRIVING_SAFETY', label: 'Driving' },
  { id: 'COMMUNICATION_PPA', label: 'PPA & Speech' },
  { id: 'NUTRITION_HYPERORALITY', label: 'Diet & Sweets' },
  { id: 'LEGAL_MEDICAID', label: 'Legal & Medicaid' },
  { id: 'CRISIS_EMERGENCY', label: 'Crisis & 911' },
];

export const FloatingChatbotAssistant: React.FC<FloatingChatbotAssistantProps> = ({
  isOpen,
  onToggle,
  onClose,
  onOpenResource,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [showFaqBrowser, setShowFaqBrowser] = useState(false);
  const [faqSearchTerm, setFaqSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hello. I am the Hopkins Care Partner Clinical Assistant, trained directly on Dr. Seema Gulyani's repository of the 50 most asked questions in Frontotemporal Dementia (FTD) and progressive caregiving.\n\nYou can ask about bathing agitation, blunt remarks, driving retirement, sweet cravings, choking, legal planning, or browse all 50 physician protocols below. How can I support you today?`,
      timestamp: 'Now',
      suggestedQuestions: [
        'Why does my loved one make blunt or rude comments in public?',
        'How do I handle violent resistance during showers and bathing?',
        'How do I stop my loved one from driving safely?',
        'Why are they constantly craving sweets and overeating?',
      ],
    },
  ]);

  // Click-outside listener & escape key to prevent capturing the screen
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

  // Focus input when opened on non-mobile devices (avoid mobile soft-keyboard takeover)
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

    setShowFaqBrowser(false);

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
      const res = await api.chatWithAssistant(q.trim());
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        isMedicationRefusal: res.isMedicationRefusal,
        citedResources: res.citedResources || [],
        matchedFaq: res.matchedFaq,
        suggestedQuestions: res.suggestedQuestions || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('RAG assistant error:', err);
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
        text: `Chat reset. I am ready to answer any caregiving questions from Dr. Seema's 50 clinical protocols.`,
        timestamp: 'Now',
        suggestedQuestions: [
          'Why does my loved one make blunt or rude comments in public?',
          'How do I handle violent resistance during showers and bathing?',
          'How do I stop my loved one from driving safely?',
          'What legal documents must be completed immediately?',
        ],
      },
    ]);
    setShowFaqBrowser(false);
  };

  // Filtered FAQs for browser
  const filteredFaqs = CLINICAL_50_FAQ.filter((faq) => {
    const matchesCat = activeCategory === 'ALL' || faq.category === activeCategory;
    if (!matchesCat) return false;
    if (!faqSearchTerm.trim()) return true;
    const term = faqSearchTerm.toLowerCase();
    return (
      faq.question.toLowerCase().includes(term) ||
      faq.keywords.some((k) => k.toLowerCase().includes(term)) ||
      faq.physicianAnswer.toLowerCase().includes(term)
    );
  });

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. FLOATING CHATBOT TRIGGER BUTTON (Compact 48-52px circle)   */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 pointer-events-auto">
        <button
          ref={triggerRef}
          onClick={onToggle}
          type="button"
          aria-label={isOpen ? 'Close Care Assistant' : 'Open Care Assistant'}
          title={isOpen ? 'Close Care Assistant' : 'Ask Dr. Seema’s Clinical Assistant (50 FAQs)'}
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
              {/* Online pulse badge */}
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CHATBOT FLOATING WINDOW (Docked bottom-right / Compact)    */}
      {/* ------------------------------------------------------------- */}
      {isOpen && (
        <div
          ref={windowRef}
          role="dialog"
          aria-label="Clinical Care Assistant"
          className="fixed bottom-19 sm:bottom-21 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-[380px] max-w-[390px] h-[500px] sm:h-[530px] max-h-[calc(100dvh-6.5rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-40 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 transition-colors"
        >
          {/* Header */}
          <div className="p-3 sm:p-3.5 bg-[#002D72] dark:bg-slate-900 text-white border-b border-blue-900/50 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 text-[#002D72] dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-serif font-bold text-sm shadow-xs">
                  SG
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#002D72] dark:border-slate-900 rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-serif font-semibold text-sm text-white truncate">
                    Dr. Seema’s Assistant
                  </h2>
                  <span title="Verified Physician Knowledge" className="inline-flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </span>
                </div>
                <p className="text-[10.5px] text-blue-200 dark:text-slate-400 truncate">
                  50 Verified Clinical Protocols · Johns Hopkins
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart chat"
                className="p-1.5 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Minimize assistant"
                className="p-1.5 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close assistant"
                className="p-1.5 text-blue-200 hover:text-white dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-white/10 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Sub-header with 50 FAQs Browser Toggle */}
          <div className="px-3 py-1.5 bg-blue-50/80 dark:bg-slate-850 border-b border-blue-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                50 Physician Q&As Loaded
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowFaqBrowser((prev) => !prev)}
              className="text-[11px] font-semibold text-[#002D72] dark:text-sky-400 hover:text-blue-900 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer transition"
            >
              <span>{showFaqBrowser ? 'Back to Chat' : 'Browse Topics'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFaqBrowser ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Body: Either 50 FAQ Directory or Chat Stream */}
          {showFaqBrowser ? (
            /* 50 FAQ Browser View */
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70 dark:bg-slate-950">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={faqSearchTerm}
                    onChange={(e) => setFaqSearchTerm(e.target.value)}
                    placeholder="Search all 50 clinical questions..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {FAQ_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-2 py-0.5 text-[10.5px] font-semibold rounded-lg whitespace-nowrap transition cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-[#002D72] text-white dark:bg-blue-600'
                          : 'bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {filteredFaqs.length} Clinical Protocols Found:
                </span>
                {filteredFaqs.map((faq) => (
                  <button
                    key={faq.id}
                    type="button"
                    onClick={() => handleSend(faq.question)}
                    className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-slate-850 shadow-2xs transition group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#002D72] dark:group-hover:text-sky-400 transition-colors leading-snug">
                        {faq.question}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-sky-400 shrink-0 mt-0.5" />
                    </div>
                    <span className="inline-block mt-1 text-[9.5px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 px-1.5 py-0.5 rounded">
                      {faq.categoryLabel}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Main Chat Stream */
            <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3 bg-slate-50/70 dark:bg-slate-950 text-sm">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl p-3 sm:p-3.5 leading-relaxed space-y-2 font-sans ${
                        isUser
                          ? 'bg-[#002D72] dark:bg-blue-600 text-white rounded-br-xs shadow-xs'
                          : msg.isMedicationRefusal
                          ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-950 dark:text-rose-100 rounded-bl-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      {/* Physician Answer Body */}
                      <div className="whitespace-pre-line select-text text-xs sm:text-[13px] leading-relaxed">
                        {msg.text}
                      </div>

                      {/* Medication Refusal Emergency Contacts */}
                      {msg.isMedicationRefusal && (
                        <div className="pt-1.5 flex flex-col gap-1.5">
                          <a
                            href="tel:4109555147"
                            className="inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Clinic: (410) 955-5147 (opt. 2)</span>
                          </a>
                          <a
                            href="tel:4105024163"
                            className="inline-flex items-center justify-center gap-1.5 bg-slate-800 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-white font-medium px-2.5 py-1.5 rounded-lg text-xs transition border border-transparent dark:border-slate-700"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Support Line: (410) 502-4163</span>
                          </a>
                        </div>
                      )}

                      {/* Cited Hopkins Care Guides */}
                      {msg.citedResources && msg.citedResources.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                          <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            Cited Clinical Guide:
                          </span>
                          {msg.citedResources.map((res, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenResource(res.id);
                              }}
                              className="flex items-center gap-1.5 text-xs text-[#002D72] dark:text-sky-400 hover:text-blue-900 dark:hover:text-sky-300 font-semibold p-1.5 -mx-1 rounded-lg hover:bg-blue-50/80 dark:hover:bg-slate-800/80 transition w-full text-left group cursor-pointer border border-transparent hover:border-blue-100 dark:hover:border-slate-750"
                            >
                              <BookOpen className="w-3.5 h-3.5 shrink-0 text-blue-700 dark:text-sky-400" />
                              <span className="truncate flex-1 underline decoration-blue-200 dark:decoration-slate-700 group-hover:decoration-blue-700 dark:group-hover:decoration-sky-400 font-medium">
                                {res.title}
                              </span>
                              <span className="text-[10px] text-blue-600 dark:text-sky-400 font-normal shrink-0">
                                Open →
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Related Follow-Up Questions from the 50 FAQs */}
                      {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                          <span className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            Related Physician Topics:
                          </span>
                          <div className="flex flex-col gap-1">
                            {msg.suggestedQuestions.map((q, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSend(q)}
                                className="text-left text-xs bg-slate-50 dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-[#002D72] dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 p-2 rounded-lg border border-slate-200/80 dark:border-slate-750 transition cursor-pointer flex items-center justify-between gap-1.5"
                              >
                                <span className="line-clamp-2 text-[11.5px] leading-snug">{q}</span>
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
          )}

          {/* Quick FAQ Starter Pills (when not in browser mode) */}
          {!showFaqBrowser && (
            <div className="px-2.5 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto flex items-center gap-1 no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => handleSend('How do I handle bathing and shower resistance?')}
                className="text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
              >
                Bathing resistance
              </button>
              <button
                type="button"
                onClick={() => handleSend('Why does my spouse say rude things with no filter?')}
                className="text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
              >
                Blunt remarks
              </button>
              <button
                type="button"
                onClick={() => handleSend('How do I take away car keys safely without fighting?')}
                className="text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
              >
                Driving retirement
              </button>
              <button
                type="button"
                onClick={() => handleSend('Why are they constantly craving sweets and overeating?')}
                className="text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
              >
                Sweet cravings
              </button>
              <button
                type="button"
                onClick={() => handleSend('My loved one insists they are not sick anosognosia')}
                className="text-[10.5px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 px-2 py-0.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium cursor-pointer"
              >
                Lack of insight
              </button>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
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

            {/* Quick emergency footnote */}
            <div className="flex items-center justify-between text-[9.5px] text-slate-400 dark:text-slate-500 pt-1 px-0.5">
              <span>Clinic: (410) 955-5147 opt. 2</span>
              <span>Crisis: 911</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
