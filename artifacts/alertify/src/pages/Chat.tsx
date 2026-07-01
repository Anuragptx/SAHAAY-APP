import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToMessages,
  sendMessage,
  type ChatMessage,
  type AlertCategory,
} from '../lib/firebase';
import { getSessionId, shortSession } from '../lib/session';

const CAT_ICON: Record<AlertCategory, string> = {
  Medical:          'medical_services',
  Safety:           'shield',
  'Technical Help': 'handyman',
};

interface ChatProps {
  alertId: string;
  category: AlertCategory;
  onBack: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat({ alertId, category, onBack }: ChatProps) {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending]     = useState(false);
  const [joined, setJoined]       = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);
  const sessionId                 = getSessionId();

  // Subscribe to Firestore messages
  useEffect(() => {
    const unsub = subscribeToMessages(alertId, (msgs) => {
      setMessages(msgs);
      setJoined(true);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return unsub;
  }, [alertId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await sendMessage(alertId, sessionId, text);
    } catch {
      alert('Message failed. Check your Firebase configuration.');
    } finally {
      setSending(false);
    }
  }, [alertId, inputText, sending, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustHeight = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const mySession = shortSession();

  return (
    <div className="flex flex-col h-full bg-[#f9f9ff]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-16 bg-[#f9f9ff] border-b border-[#dce2f7] shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e9edff] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-[#5c403c]">arrow_back</span>
          </button>
          <div className="flex items-center gap-1.5 text-[#b70011] font-black ml-1">
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {CAT_ICON[category]}
            </span>
            <span className="text-[18px]">Alertify</span>
          </div>
        </div>
        <span className="text-[12px] font-semibold text-[#5c403c] border border-[#e6bdb8] px-3 py-1 rounded-full">
          Anonymous · {mySession}
        </span>
      </header>

      {/* Chat context sub-header */}
      <div className="bg-[#f1f3ff] border-b border-[#dce2f7]/60 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#141b2b] flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[20px] text-[#b70011]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {CAT_ICON[category]}
            </span>
            Chat: {category}
          </h2>
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#b70011] pulse-dot" />
            <span className="text-[11px] font-bold text-[#b70011]">Live</span>
          </div>
        </div>
        {/* Ephemeral notice */}
        <div className="mt-2 bg-[#e9edff] border-l-4 border-[#fed01b] rounded-r-lg px-3 py-2 flex items-start gap-2">
          <span className="material-symbols-outlined text-[14px] text-[#5c403c] mt-0.5">timer</span>
          <p className="text-[12px] text-[#5c403c] leading-relaxed">
            This chat is ephemeral and will be deleted after 2 hours. No history is stored.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-3">
        {/* Session started */}
        <div className="flex justify-center">
          <span className="bg-[#dce2f7] text-[#5c403c] text-[11px] font-semibold px-3 py-1 rounded-full">
            Session Started · {formatTime(new Date())}
          </span>
        </div>

        {!joined && (
          <div className="flex justify-center mt-4">
            <span className="text-[13px] text-[#5c403c]">Connecting to chat…</span>
          </div>
        )}

        {joined && messages.length === 0 && (
          <div className="flex flex-col items-center mt-6 gap-2 text-center">
            <span
              className="material-symbols-outlined text-[40px] text-[#dce2f7]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              forum
            </span>
            <p className="text-[14px] text-[#5c403c] font-medium">No messages yet</p>
            <p className="text-[12px] text-[#916f6b]">Be the first to respond to this alert</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe   = msg.sessionId === sessionId;
          const sentAt = msg.sentAt ? msg.sentAt.toDate() : new Date();
          // Group consecutive messages from same sender
          const prevMsg  = messages[idx - 1];
          const showLabel = !prevMsg || prevMsg.sessionId !== msg.sessionId;

          return (
            <div
              key={msg.id ?? idx}
              className={`flex flex-col max-w-[84%] gap-0.5 animate-fade-in ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
            >
              {showLabel && (
                <span className={`text-[11px] font-bold text-[#5c403c] ${isMe ? 'mr-1' : 'ml-1'}`}>
                  {isMe ? 'You' : 'Helper'}
                </span>
              )}
              <div
                className={`px-4 py-3 shadow-sm relative group ${
                  isMe
                    ? 'bg-[#b70011] text-white rounded-2xl rounded-tr-sm border-2 border-[#dc2626]'
                    : 'bg-[#e1e8fd] text-[#141b2b] rounded-2xl rounded-tl-sm border border-[#dce2f7]'
                }`}
              >
                <p className="text-[15px] leading-relaxed">{msg.text}</p>
                <span
                  className={`text-[10px] mt-1 block ${isMe ? 'text-white/60 text-right' : 'text-[#5c403c]/60 text-right'}`}
                >
                  {formatTime(sentAt)}
                </span>
                {isMe && (
                  <span
                    className="material-symbols-outlined text-[13px] text-white/70 absolute bottom-2 right-2"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    done_all
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="bg-[#f9f9ff] border-t border-[#dce2f7]/60 px-4 py-3 shrink-0">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => { setInputText(e.target.value); adjustHeight(e.target); }}
              onKeyDown={handleKeyDown}
              placeholder="Type message…"
              rows={1}
              className="w-full bg-white border-2 border-[#dce2f7] focus:border-[#b70011] focus:outline-none rounded-xl px-4 py-3 text-[15px] text-[#141b2b] placeholder:text-[#916f6b] resize-none min-h-[48px] max-h-[120px] transition-colors"
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <button type="button" className="p-1.5 text-[#5c403c] hover:bg-[#e9edff] rounded-full transition-colors">
                <span className="material-symbols-outlined text-[18px]">add_location</span>
              </button>
              <button type="button" className="p-1.5 text-[#5c403c] hover:bg-[#e9edff] rounded-full transition-colors">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-12 h-12 shrink-0 bg-[#b70011] text-white rounded-full flex items-center justify-center shadow-md border-2 border-[#dc2626] active:scale-95 transition-transform disabled:opacity-40"
          >
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
