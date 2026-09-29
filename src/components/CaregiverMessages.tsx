import React, { useState, useEffect } from 'react';
import {
  Send,
  User,
  ShieldCheck,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { CurrentUser, PrivateConversationMessage } from '../types';
import { api } from '../services/api';

interface CaregiverMessagesProps {
  currentUser: CurrentUser;
}

export const CaregiverMessages: React.FC<CaregiverMessagesProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<PrivateConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const msgs = await api.getPrivateChat(currentUser.id);
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [currentUser.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await api.sendPrivateChatMessage({
        caregiverId: currentUser.id,
        senderId: currentUser.id,
        content: inputText.trim(),
      });
      setInputText('');
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#002D72] text-white flex items-center justify-center font-bold text-xs">
              SG
            </div>
            <div>
              <h2 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                <span>Dr. Seema Gulyani</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                  Clinician Moderator
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Direct confidential clinic channel • Not visible to other care partners
              </p>
            </div>
          </div>

          <button
            onClick={loadMessages}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat Messages Card */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[520px] overflow-hidden">
        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 text-xs">
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-1">
              <p className="font-medium text-slate-600">No private messages yet.</p>
              <p className="text-[11px]">
                You can write to Dr. Seema directly here regarding private symptoms, caregiver stress, or clinical questions.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                      isMe
                        ? 'bg-[#002D72] text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                    }`}
                  >
                    {!isMe && (
                      <div className="font-semibold text-[10px] text-[#002D72] pb-0.5">
                        {msg.senderName}
                      </div>
                    )}
                    <div className="whitespace-pre-line font-sans">{msg.content}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 px-2 mt-0.5">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a private message to Dr. Seema..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold transition"
          >
            Send
          </button>
        </form>
      </div>

      <div className="text-center text-[11px] text-slate-400">
        In physical emergencies or acute distress, call 911 or the Clinic Caregiver Support Line at (410) 555-FTDC.
      </div>
    </div>
  );
};
