import React, { useState } from 'react';
import {
  Send,
  X,
  Phone,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api';

interface RagAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResource: (resourceId: string) => void;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  isMedicationRefusal?: boolean;
  citedResources?: { id: string; title: string; url?: string }[];
  timestamp: string;
}

export const RagAssistantModal: React.FC<RagAssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenResource,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: `Hello. I can help answer caregiving questions using guides approved by Dr. Seema Gulyani, such as daily routines, managing agitation, and legal support. How can I help you today?`,
      timestamp: 'Now',
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q || !q.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: q.trim(),
      timestamp: 'Now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.chatWithAssistant(q.trim());
      const botMsg: ChatMessage = {
        sender: 'assistant',
        text: res.answer,
        isMedicationRefusal: res.isMedicationRefusal,
        citedResources: res.citedResources || [],
        timestamp: 'Now',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('RAG assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to connect to clinical resources right now. For urgent clinical support, please call (410) 555-FTDC.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Tips for calming bathing agitation',
    'How to handle resistance to hygiene',
    'Restlessness and night wandering',
    'Medicaid and legal planning',
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Clean Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="font-serif font-semibold text-slate-900 text-base sm:text-lg">
              Care Assistant
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Approved care guides from Dr. Seema Gulyani
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50 text-sm">
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 leading-relaxed space-y-2.5 font-sans ${
                    isUser
                      ? 'bg-[#002D72] text-white rounded-br-xs'
                      : msg.isMedicationRefusal
                      ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-bl-xs'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-line select-text text-sm sm:text-[15px]">
                    {msg.text}
                  </div>

                  {msg.isMedicationRefusal && (
                    <div className="pt-1">
                      <a
                        href="tel:4105553832"
                        className="inline-flex items-center gap-1.5 bg-rose-600 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs hover:bg-rose-700 transition"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Clinic: (410) 555-FTDC</span>
                      </a>
                    </div>
                  )}

                  {msg.citedResources && msg.citedResources.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {msg.citedResources.map((res, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-[#002D72] font-semibold">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{res.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="text-slate-400 text-xs p-2 italic font-sans">
              Checking clinical guidelines...
            </div>
          )}
        </div>

        {/* Quick Topics */}
        <div className="px-3.5 py-2.5 border-t border-slate-100 bg-white overflow-x-auto flex items-center gap-2 no-scrollbar shrink-0">
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg whitespace-nowrap transition shrink-0 font-medium"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a practical care question..."
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] font-sans"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-2.5 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-200 text-white rounded-xl transition shrink-0 shadow-xs"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
