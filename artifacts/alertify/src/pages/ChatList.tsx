import React, { useEffect, useState } from 'react';
import { subscribeToAlerts, type Alert, type AlertCategory } from '../lib/firebase';
import { getCurrentPosition, distanceKm, timeRemaining, type Coords } from '../lib/geo';
import { getSessionId } from '../lib/session';

const CAT_CONFIG: Record<AlertCategory, { color: string; darkBg: string; lightBg: string; icon: string; label: string }> = {
  Medical:          { color: '#dc2626', lightBg: '#ffdad6', darkBg: '#3d0008', icon: 'medical_services', label: 'Medical Emergency' },
  Safety:           { color: '#2563eb', lightBg: '#dbe1ff', darkBg: '#1a2e6b', icon: 'shield',           label: 'Safety Alert' },
  'Technical Help': { color: '#ca8a04', lightBg: '#ffe083', darkBg: '#3a2d00', icon: 'handyman',         label: 'Technical Help' },
};

interface ChatListProps {
  onJoin: (alertId: string, category: AlertCategory, expiresAt: Date | null) => void;
  isDark: boolean;
  toggleDark: () => void;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 px-4 pt-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface-container rounded-2xl h-[110px]" />
      ))}
    </div>
  );
}

export default function ChatList({ onJoin, isDark, toggleDark }: ChatListProps) {
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [myCoords, setMyCoords] = useState<Coords | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tick, setTick]         = useState(0);
  const sessionId               = getSessionId();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getCurrentPosition().then(setMyCoords).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = subscribeToAlerts((live) => {
      setAlerts(live);
      setLoading(false);
    });
    return unsub;
  }, []);

  const myAlerts    = alerts.filter((a) => a.sessionId === sessionId);
  const otherAlerts = alerts.filter((a) => a.sessionId !== sessionId);

  const sorted = [
    ...myAlerts,
    ...otherAlerts.sort((a, b) => {
      if (!myCoords) return 0;
      return (
        distanceKm(myCoords, { lat: a.lat, lng: a.lng }) -
        distanceKm(myCoords, { lat: b.lat, lng: b.lng })
      );
    }),
  ];

  return (
    <div className="flex flex-col h-full bg-surface transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-16 bg-surface border-b border-surface-variant shadow-sm shrink-0 sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[24px] text-[#b70011]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            forum
          </span>
          <h1 className="text-[20px] font-black tracking-tight text-[#b70011]">Alert Chats</h1>
        </div>
        <div className="flex items-center gap-2">
          {sorted.length > 0 && (
            <span className="bg-[#dc2626] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
              {sorted.length} active
            </span>
          )}
          <button
            onClick={toggleDark}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
            aria-label={isDark ? 'Light mode' : 'Dark mode'}
          >
            <span
              className="material-symbols-outlined text-[20px] text-on-surface-variant"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      {/* Sub-info bar */}
      <div className="bg-surface-container-low border-b border-surface-variant px-5 py-2 flex items-center gap-2 shrink-0 transition-colors">
        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">timer</span>
        <p className="text-[12px] text-on-surface-variant">
          All chats are ephemeral — messages auto-delete after 2 hours
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading && <Skeleton />}

        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center pb-10">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[40px] text-surface-container-highest"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mark_chat_unread
              </span>
            </div>
            <h2 className="text-[18px] font-bold text-on-surface">No Active Alerts Nearby</h2>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              When someone broadcasts an SOS alert near you, it will appear here. Tap{' '}
              <strong className="text-on-surface">"I Can Help"</strong> on the Live Map to open a chat.
            </p>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="px-4 py-4 space-y-3">
            {sorted.map((alert) => {
              const cfg     = CAT_CONFIG[alert.category];
              const isMyOwn = alert.sessionId === sessionId;
              const dist    = myCoords
                ? distanceKm(myCoords, { lat: alert.lat, lng: alert.lng })
                : null;
              const expiry  = alert.expiresAt ? alert.expiresAt.toDate() : null;
              const ttl     = expiry ? timeRemaining(expiry) : null;
              const urgentTtl =
                expiry && expiry.getTime() - Date.now() < 10 * 60 * 1000;

              const iconBg = isDark ? cfg.darkBg : cfg.lightBg;

              return (
                <div
                  key={alert.id}
                  className="bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm overflow-hidden animate-fade-in transition-colors"
                  style={{ borderLeftWidth: 4, borderLeftColor: cfg.color }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: iconBg }}
                        >
                          <span
                            className="material-symbols-outlined text-[18px]"
                            style={{ color: cfg.color, fontVariationSettings: "'FILL' 1" }}
                          >
                            {cfg.icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold" style={{ color: cfg.color }}>
                            {cfg.label}
                            {isMyOwn && (
                              <span className="ml-2 text-[10px] bg-surface-container text-[#004ed0] dark:text-[#aabbff] px-2 py-0.5 rounded-full font-semibold">
                                Your Alert
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {dist !== null && (
                              <span className="text-[11px] text-on-surface-variant flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">near_me</span>
                                {dist < 0.1 ? 'Here' : `${dist.toFixed(1)} km`}
                              </span>
                            )}
                            {ttl && (
                              <span
                                className={`text-[11px] font-semibold flex items-center gap-0.5 ${urgentTtl ? 'text-[#b70011]' : 'text-on-surface-variant'}`}
                              >
                                <span className="material-symbols-outlined text-[12px]">timer</span>
                                {ttl}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#b70011] pulse-dot" />
                        <span className="text-[10px] font-bold text-[#b70011]">LIVE</span>
                      </div>
                    </div>

                    <button
                      onClick={() => alert.id && onJoin(alert.id, alert.category, expiry)}
                      className="w-full py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-transform active:scale-95"
                      style={{
                        background: isMyOwn ? (isDark ? '#1c2540' : '#f1f3ff') : cfg.color,
                        color:      isMyOwn ? cfg.color : '#fff',
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {isMyOwn ? 'manage_accounts' : 'volunteer_activism'}
                      </span>
                      {isMyOwn ? 'Monitor My Alert Chat' : 'I Can Help — Open Chat'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
