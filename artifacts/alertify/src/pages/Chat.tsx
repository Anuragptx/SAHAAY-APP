import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribeToMessages,
  sendMessage,
  setTypingIndicator,
  clearTypingIndicator,
  subscribeToTyping,
  type ChatMessage,
  type AlertCategory,
} from '../lib/firebase';
import { getSessionId, shortSession } from '../lib/session';
import { timeRemaining } from '../lib/geo';

const CAT_CONFIG: Record<AlertCategory, { color: string; bg: string; icon: string; label: string }> = {
  Medical:          { color: '#dc2626', bg: '#ffdad6', icon: 'medical_services', label: 'Medical Emergency' },
  Safety:           { color: '#2563eb', bg: '#dbe1ff', icon: 'shield',           label: 'Safety Alert' },
  'Technical Help': { color: '#ca8a04', bg: '#ffe083', icon: 'handyman',         label: 'Technical Help' },
};

const QUICK_REPLIES: Record<AlertCategory, string[]> = {
  Medical:          ['On my way 🏃', 'Call 911 📞', 'Stay calm, help is near', 'What is your exact location?'],
  Safety:           ['On my way 🏃', 'I see you — stay put', 'Call 911 📞', 'Are you safe now?'],
  'Technical Help': ['On my way 🔧', 'What is the issue?', 'Do you have tools nearby?', 'Can you share your location?'],
};

const MAX_CHARS = 500;

interface LocalMessage {
  localId: string;
  sessionId: string;
  text: string;
  sentAt: Date;
  status: 'sending' | 'sent' | 'failed';
  firestoreId?: string;
}

interface ChatProps {
  alertId: string;
  category: AlertCategory;
  expiresAt: Date | null;
  onBack: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Show a separator when gap between messages is > 5 minutes */
function shouldShowTimeSep(prev: Date | null, curr: Date): boolean {
  if (!prev) return false;
  return curr.getTime() - prev.getTime() > 5 * 60 * 1000;
}

function TypingDots() {
  return (
    <div className="flex items-end gap-1 px-4 py-3 bg-[#e1e8fd] rounded-2xl rounded-tl-sm w-16">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[#5c403c]/40"
          style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function Chat({ alertId, category, expiresAt, onBack }: ChatProps) {
  const [firestoreMsgs, setFirestoreMsgs] = useState<ChatMessage[]>([]);
  const [localMsgs, setLocalMsgs]         = useState<LocalMessage[]>([]);
  const [inputText, setInputText]         = useState('');
  const [joined, setJoined]               = useState(false);
  const [typingUsers, setTypingUsers]     = useState<string[]>([]);
  const [tick, setTick]                   = useState(0);
  const bottomRef     = useRef<HTMLDivElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const typingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef   = useRef(false);
  const sessionId     = getSessionId();
  const mySession     = shortSession();
  const cfg           = CAT_CONFIG[category];

  // Countdown
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to Firestore messages
  useEffect(() => {
    const unsub = subscribeToMessages(alertId, (msgs) => {
      setFirestoreMsgs(msgs);
      setJoined(true);
      // Mark local optimistic messages as "sent" once their Firestore counterpart arrives.
      // Match by stable clientId field — prevents false dedup on identical text.
      const firestoreClientIds = new Set(msgs.map((m) => m.clientId).filter(Boolean));
      setLocalMsgs((prev) =>
        prev.map((lm) => {
          if (lm.status === 'sending' && firestoreClientIds.has(lm.localId)) {
            const match = msgs.find((fm) => fm.clientId === lm.localId);
            return { ...lm, status: 'sent', firestoreId: match?.id };
          }
          return lm;
        }),
      );
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    return unsub;
  }, [alertId, sessionId]);

  // Subscribe to typing indicators
  useEffect(() => {
    const unsub = subscribeToTyping(alertId, sessionId, setTypingUsers);
    return unsub;
  }, [alertId, sessionId]);

  // Scroll to bottom on join
  useEffect(() => {
    if (joined) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [joined]);

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      clearTypingIndicator(alertId, sessionId).catch(() => {});
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [alertId, sessionId]);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setTypingIndicator(alertId, sessionId).catch(() => {});
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      clearTypingIndicator(alertId, sessionId).catch(() => {});
    }, 4000);
  }, [alertId, sessionId]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? inputText).trim();
    if (!msg) return;

    // Optimistic local message
    const localId = crypto.randomUUID();
    const optimistic: LocalMessage = {
      localId,
      sessionId,
      text: msg,
      sentAt: new Date(),
      status: 'sending',
    };
    setLocalMsgs((prev) => [...prev, optimistic]);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '48px';
    }

    // Stop typing indicator
    isTypingRef.current = false;
    clearTypingIndicator(alertId, sessionId).catch(() => {});

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      await sendMessage(alertId, sessionId, msg, localId);
    } catch {
      // Mark as failed — show error state with retry option
      setLocalMsgs((prev) =>
        prev.map((lm) => (lm.localId === localId ? { ...lm, status: 'failed' } : lm)),
      );
    }
  }, [alertId, inputText, sessionId]);

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

  // Merge Firestore + local messages.
  // Only show local messages whose clientId hasn't yet appeared in Firestore —
  // prevents duplicate bubbles while keeping identical-text messages distinct.
  const firestoreClientIds = new Set(firestoreMsgs.map((m) => m.clientId).filter(Boolean));
  const pendingLocals = localMsgs.filter(
    (lm) => lm.status !== 'sent' && !firestoreClientIds.has(lm.localId),
  );

  // Build unified message list
  type DisplayMsg =
    | { kind: 'firestore'; msg: ChatMessage }
    | { kind: 'local'; msg: LocalMessage };

  const allMsgs: DisplayMsg[] = [
    ...firestoreMsgs.map((m) => ({ kind: 'firestore' as const, msg: m })),
    ...pendingLocals.map((m) => ({ kind: 'local' as const, msg: m })),
  ].sort((a, b) => {
    const aTime =
      a.kind === 'firestore'
        ? (a.msg.sentAt?.toMillis() ?? 0)
        : a.msg.sentAt.getTime();
    const bTime =
      b.kind === 'firestore'
        ? (b.msg.sentAt?.toMillis() ?? 0)
        : b.msg.sentAt.getTime();
    return aTime - bTime;
  });

  const ttl       = expiresAt ? timeRemaining(expiresAt) : null;
  const urgentTtl = expiresAt && expiresAt.getTime() - Date.now() < 10 * 60 * 1000;
  const charCount = inputText.length;

  return (
    <div className="flex flex-col h-full bg-[#f9f9ff]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-16 bg-[#f9f9ff] border-b border-[#dce2f7] shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#e9edff] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-[#5c403c]">arrow_back</span>
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center ml-1"
            style={{ background: cfg.bg }}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ color: cfg.color, fontVariationSettings: "'FILL' 1" }}
            >
              {cfg.icon}
            </span>
          </div>
          <div>
            <p className="text-[15px] font-bold text-[#141b2b] leading-none">{cfg.label}</p>
            <p className="text-[11px] text-[#5c403c] mt-0.5">Anonymous · {mySession}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ttl && (
            <span
              className={`text-[11px] font-bold flex items-center gap-1 px-2.5 py-1 rounded-full border ${
                urgentTtl
                  ? 'bg-red-50 border-red-200 text-[#b70011]'
                  : 'bg-[#f1f3ff] border-[#dce2f7] text-[#5c403c]'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">timer</span>
              {ttl}
            </span>
          )}
          <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b70011] pulse-dot" />
            <span className="text-[11px] font-bold text-[#b70011]">Live</span>
          </div>
        </div>
      </header>

      {/* Ephemeral notice */}
      <div className="bg-[#f1f3ff] border-b border-[#dce2f7]/60 px-4 py-2 flex items-center gap-2 shrink-0">
        <span className="material-symbols-outlined text-[13px] text-[#5c403c]">timer</span>
        <p className="text-[12px] text-[#5c403c]">
          Ephemeral chat — messages auto-delete after 2 hours · No history stored
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 flex flex-col gap-2.5">
        {/* Session started */}
        <div className="flex justify-center mb-1">
          <span className="bg-[#dce2f7] text-[#5c403c] text-[11px] font-semibold px-3 py-1 rounded-full">
            Session Started · {formatTime(new Date())}
          </span>
        </div>

        {!joined && (
          <div className="flex flex-col items-center gap-3 mt-8">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-[#b70011]/30"
                  style={{ animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <p className="text-[13px] text-[#5c403c]">Connecting to chat…</p>
          </div>
        )}

        {joined && allMsgs.length === 0 && (
          <div className="flex flex-col items-center mt-8 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-[#e9edff] flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[32px] text-[#dce2f7]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                forum
              </span>
            </div>
            <p className="text-[14px] font-bold text-[#141b2b]">No messages yet</p>
            <p className="text-[12px] text-[#916f6b]">
              Send a quick reply below to start helping
            </p>
          </div>
        )}

        {/* Message bubbles */}
        {(() => {
          let prevDate: Date | null = null;
          return allMsgs.map((item, idx) => {
            const isFirestore = item.kind === 'firestore';
            const fmsg = isFirestore ? (item.msg as ChatMessage) : null;
            const lmsg = !isFirestore ? (item.msg as LocalMessage) : null;

            const msgSessionId = fmsg?.sessionId ?? lmsg!.sessionId;
            const msgText      = fmsg?.text ?? lmsg!.text;
            const msgDate      = fmsg?.sentAt
              ? fmsg.sentAt.toDate()
              : lmsg!.sentAt;
            const isPending    = lmsg?.status === 'sending';
            const isFailed     = lmsg?.status === 'failed';
            const isMe         = msgSessionId === sessionId;

            const prevItem = allMsgs[idx - 1];
            const prevSid  = prevItem
              ? prevItem.kind === 'firestore'
                ? (prevItem.msg as ChatMessage).sessionId
                : (prevItem.msg as LocalMessage).sessionId
              : null;
            const showLabel = prevSid !== msgSessionId;
            const showSep   = shouldShowTimeSep(prevDate, msgDate);
            prevDate = msgDate;

            return (
              <React.Fragment key={isFirestore ? fmsg!.id ?? idx : lmsg!.localId}>
                {showSep && (
                  <div className="flex justify-center my-1">
                    <span className="bg-[#dce2f7] text-[#5c403c] text-[10px] font-semibold px-3 py-0.5 rounded-full">
                      {formatTime(msgDate)}
                    </span>
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[82%] gap-0.5 animate-fade-in ${
                    isMe ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  {showLabel && (
                    <span
                      className={`text-[11px] font-bold text-[#5c403c] ${isMe ? 'mr-1' : 'ml-1'}`}
                    >
                      {isMe ? 'You' : 'Helper'}
                    </span>
                  )}

                  <div
                    className={`px-4 py-2.5 shadow-sm transition-opacity ${
                      isPending ? 'opacity-50' : 'opacity-100'
                    } ${
                      isFailed
                        ? 'bg-white text-[#141b2b] rounded-2xl rounded-tr-sm border-2 border-[#b70011]/40'
                        : isMe
                        ? 'bg-[#b70011] text-white rounded-2xl rounded-tr-sm border-2 border-[#dc2626]'
                        : 'bg-[#e1e8fd] text-[#141b2b] rounded-2xl rounded-tl-sm border border-[#dce2f7]'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {msgText}
                    </p>
                    <div
                      className={`flex items-center justify-end gap-1 mt-1 ${
                        isMe && !isFailed ? 'text-white/60' : 'text-[#5c403c]/50'
                      }`}
                    >
                      {isFailed ? (
                        <button
                          onClick={() => {
                            // Remove failed local msg and retry
                            if (lmsg) {
                              setLocalMsgs((prev) => prev.filter((m) => m.localId !== lmsg.localId));
                              handleSend(lmsg.text);
                            }
                          }}
                          className="flex items-center gap-1 text-[#b70011] text-[11px] font-semibold"
                        >
                          <span className="material-symbols-outlined text-[13px]">error</span>
                          Failed · Tap to retry
                        </button>
                      ) : (
                        <>
                          <span className="text-[10px]">{formatTime(msgDate)}</span>
                          {isMe && (
                            <span
                              className="material-symbols-outlined text-[12px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              {isPending ? 'schedule' : 'done_all'}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          });
        })()}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="self-start flex flex-col items-start gap-0.5 animate-fade-in">
            <span className="text-[11px] font-bold text-[#5c403c] ml-1">Helper</span>
            <TypingDots />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {joined && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {QUICK_REPLIES[category].map((reply) => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                className="shrink-0 bg-[#f1f3ff] border border-[#dce2f7] text-[#141b2b] text-[12px] font-semibold px-3 py-1.5 rounded-full hover:bg-[#e9edff] active:scale-95 transition-all whitespace-nowrap"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="bg-[#f9f9ff] border-t border-[#dce2f7]/60 px-4 pt-2 pb-3 shrink-0">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setInputText(e.target.value);
                  adjustHeight(e.target);
                  handleTyping();
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="w-full bg-white border-2 border-[#dce2f7] focus:border-[#b70011] focus:outline-none rounded-xl px-4 py-3 pr-16 text-[15px] text-[#141b2b] placeholder:text-[#916f6b] resize-none min-h-[48px] max-h-[120px] transition-colors"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {charCount > MAX_CHARS * 0.8 && (
                <span
                  className={`text-[10px] font-bold ${charCount >= MAX_CHARS ? 'text-[#b70011]' : 'text-[#5c403c]'}`}
                >
                  {MAX_CHARS - charCount}
                </span>
              )}
              <button
                type="button"
                className="p-1.5 text-[#5c403c] hover:bg-[#e9edff] rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">add_location</span>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-12 h-12 shrink-0 bg-[#b70011] text-white rounded-full flex items-center justify-center shadow-md border-2 border-[#dc2626] active:scale-95 transition-transform disabled:opacity-30"
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
