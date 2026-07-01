import React, { useState, useEffect, useCallback } from 'react';
import { getSessionId, shortSession } from '../lib/session';
import { broadcastAlert, purgeExpiredAlerts, type AlertCategory } from '../lib/firebase';
import { getCurrentPosition, formatCoords, type Coords } from '../lib/geo';

type SOSDashboardProps = {
  onAlertBroadcast: (alertId: string, category: AlertCategory) => void;
};

const CATEGORIES: { label: AlertCategory; icon: string; bg: string; iconColor: string }[] = [
  { label: 'Medical',        icon: 'local_hospital', bg: 'bg-[#ffdad6]', iconColor: 'text-[#ba1a1a]' },
  { label: 'Safety',         icon: 'shield',         bg: 'bg-[#dbe1ff]', iconColor: 'text-[#004ed0]' },
  { label: 'Technical Help', icon: 'handyman',       bg: 'bg-[#ffe083]', iconColor: 'text-[#574500]' },
];

export default function SOSDashboard({ onAlertBroadcast }: SOSDashboardProps) {
  const [coords, setCoords]             = useState<Coords | null>(null);
  const [gpsStatus, setGpsStatus]       = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [selectedCat, setSelectedCat]   = useState<AlertCategory | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [recentAlert, setRecentAlert]   = useState<string | null>(null);

  // Acquire GPS on mount
  useEffect(() => {
    setGpsStatus('loading');
    getCurrentPosition()
      .then((c) => { setCoords(c); setGpsStatus('ok'); })
      .catch(() => setGpsStatus('error'));
    // Run cleanup of expired alerts on load
    purgeExpiredAlerts().catch(() => {});
  }, []);

  const handleBroadcast = useCallback(async (cat?: AlertCategory) => {
    const category = cat ?? selectedCat ?? 'Medical';
    setBroadcasting(true);
    try {
      let location = coords;
      if (!location) {
        location = await getCurrentPosition();
        setCoords(location);
        setGpsStatus('ok');
      }
      const id = await broadcastAlert(getSessionId(), category, location.lat, location.lng);
      setRecentAlert(id);
      onAlertBroadcast(id, category);
    } catch (err) {
      console.error('Broadcast failed:', err);
      alert('Could not broadcast alert. Please check your Firebase configuration and GPS permissions.');
    } finally {
      setBroadcasting(false);
    }
  }, [coords, selectedCat, onAlertBroadcast]);

  const session = shortSession();

  return (
    <div className="flex flex-col h-full bg-[#f9f9ff]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 h-16 bg-[#f9f9ff] border-b border-[#dce2f7] shadow-sm shrink-0 sticky top-0 z-10">
        <h1 className="text-[22px] font-black tracking-tight text-[#b70011]">Alertify</h1>
        <div className="flex items-center gap-2 bg-[#e1e8fd] px-3 py-1.5 rounded-full">
          <span className="material-symbols-outlined text-[16px] text-[#004ed0]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
          <span className="text-[13px] font-semibold text-[#5c403c]">Anonymous Mode</span>
          <div className="w-8 h-4.5 bg-[#004ed0] rounded-full ml-1 flex items-center px-0.5">
            <div className="w-3.5 h-3.5 bg-white rounded-full translate-x-3.5" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto flex flex-col items-center px-5 py-4 gap-5">
        {/* Session + GPS status */}
        <div className="w-full max-w-sm bg-[#e9edff] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#ffdad6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#b70011]">my_location</span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[#5c403c] uppercase tracking-wide">Current Location</p>
              <p className="text-[14px] font-mono text-[#141b2b] mt-0.5">
                {gpsStatus === 'loading' && 'Acquiring GPS…'}
                {gpsStatus === 'error'   && 'GPS unavailable'}
                {gpsStatus === 'ok' && coords && formatCoords(coords.lat, coords.lng)}
                {gpsStatus === 'idle'    && 'Tap SOS to locate'}
              </p>
            </div>
          </div>
          <span
            className={`material-symbols-outlined text-[#004ed0] ${gpsStatus === 'loading' ? 'animate-spin' : gpsStatus === 'ok' ? '' : ''}`}
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {gpsStatus === 'ok' ? 'satellite_alt' : 'gps_not_fixed'}
          </span>
        </div>

        {/* Big SOS Button */}
        <div className="py-6 flex justify-center w-full">
          <button
            onClick={() => handleBroadcast()}
            disabled={broadcasting}
            className="pulse-sos w-60 h-60 rounded-full bg-[#b70011] flex flex-col items-center justify-center gap-2 shadow-2xl border-[8px] border-[#ffdad6] active:scale-95 transition-transform disabled:opacity-70"
            aria-label="Broadcast SOS Alert"
          >
            <span
              className="material-symbols-outlined text-white"
              style={{ fontSize: 76, fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
            <span className="text-[46px] leading-none font-black text-white tracking-widest">
              {broadcasting ? '…' : 'SOS'}
            </span>
            <span className="text-white text-[13px] font-bold tracking-widest uppercase opacity-90">
              {broadcasting ? 'Broadcasting…' : 'Broadcast Alert'}
            </span>
          </button>
        </div>

        {/* Category picker */}
        <div className="w-full max-w-sm">
          <h2 className="text-[20px] font-bold text-center mb-4 text-[#141b2b]">Specific Assistance</h2>
          <div className="grid grid-cols-3 gap-3">
            {CATEGORIES.map(({ label, icon, bg, iconColor }) => (
              <button
                key={label}
                onClick={() => {
                  setSelectedCat(label);
                  handleBroadcast(label);
                }}
                disabled={broadcasting}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all shadow-sm disabled:opacity-60 ${
                  selectedCat === label
                    ? 'border-[#b70011] bg-[#ffdad6]'
                    : 'border-[#dce2f7] bg-white hover:bg-[#f1f3ff]'
                }`}
              >
                <div className={`h-12 w-12 rounded-full ${bg} flex items-center justify-center`}>
                  <span
                    className={`material-symbols-outlined text-[26px] ${iconColor}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                </div>
                <span className="text-[13px] font-bold text-[#141b2b] text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent broadcast confirmation */}
        {recentAlert && (
          <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <span className="material-symbols-outlined text-green-600 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <div>
              <p className="text-[14px] font-bold text-green-800">Alert Broadcast Successfully</p>
              <p className="text-[12px] text-green-700 mt-0.5">Anonymous · Auto-expires in 2 hours</p>
              <p className="text-[11px] font-mono text-green-600 mt-1">ID: {recentAlert.slice(0, 12)}…</p>
            </div>
          </div>
        )}

        {/* Anonymous session badge */}
        <div className="w-full max-w-sm flex items-center justify-center gap-2 py-2">
          <span className="material-symbols-outlined text-[14px] text-[#5c403c]" style={{ fontVariationSettings: "'FILL' 0" }}>verified_user</span>
          <span className="text-[12px] text-[#5c403c]">Session: <span className="font-mono font-bold">{session}</span> · No data stored</span>
        </div>

        {/* Firebase setup notice */}
        <div className="w-full max-w-sm bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-[12px] font-bold text-amber-800 mb-1">⚙️ Firebase Setup Required</p>
          <p className="text-[11px] text-amber-700">
            Open <code className="bg-amber-100 px-1 rounded">src/lib/firebase.ts</code> and replace the placeholder values with your Firebase project credentials to enable real-time alerts and chat.
          </p>
        </div>
      </main>
    </div>
  );
}
