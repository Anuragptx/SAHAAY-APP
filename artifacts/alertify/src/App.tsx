import React, { useState } from 'react';
import SOSDashboard from './pages/SOSDashboard';
import LiveMap from './pages/LiveMap';
import Chat from './pages/Chat';
import BottomNav from './components/BottomNav';
import { type AlertCategory } from './lib/firebase';

type Tab = 'dashboard' | 'map' | 'chat';

// Inject Google Fonts + Material Symbols
const link1 = document.createElement('link');
link1.rel = 'preconnect';
link1.href = 'https://fonts.googleapis.com';
document.head.appendChild(link1);

const link2 = document.createElement('link');
link2.rel = 'stylesheet';
link2.href =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
document.head.appendChild(link2);

const link3 = document.createElement('link');
link3.rel = 'stylesheet';
link3.href =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';
document.head.appendChild(link3);

export default function App() {
  const [activeTab, setActiveTab]     = useState<Tab>('dashboard');
  const [chatAlertId, setChatAlertId] = useState<string | null>(null);
  const [chatCategory, setChatCategory] = useState<AlertCategory>('Medical');
  const [lastAlertId, setLastAlertId] = useState<string | undefined>();

  const handleAlertBroadcast = (alertId: string, category: AlertCategory) => {
    setLastAlertId(alertId);
    // Automatically switch to map view after broadcasting
    setTimeout(() => setActiveTab('map'), 600);
  };

  const handleOpenChat = (alertId: string, category: AlertCategory) => {
    setChatAlertId(alertId);
    setChatCategory(category);
    setActiveTab('chat');
  };

  const handleBack = () => {
    setActiveTab('map');
  };

  // If user is in chat with a specific alert, show Chat (no bottom nav)
  if (activeTab === 'chat' && chatAlertId) {
    return (
      <div className="flex flex-col h-full">
        <Chat alertId={chatAlertId} category={chatCategory} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && (
          <SOSDashboard onAlertBroadcast={handleAlertBroadcast} />
        )}
        {activeTab === 'map' && (
          <LiveMap activeAlertId={lastAlertId} onOpenChat={handleOpenChat} />
        )}
        {/* Chat without a selected alert shows an empty state */}
        {activeTab === 'chat' && !chatAlertId && (
          <div className="flex flex-col h-full items-center justify-center gap-4 bg-[#f9f9ff] px-6">
            <span
              className="material-symbols-outlined text-[64px] text-[#dce2f7]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              forum
            </span>
            <h2 className="text-[20px] font-bold text-[#141b2b]">No Active Chat</h2>
            <p className="text-[14px] text-[#5c403c] text-center leading-relaxed">
              Go to the Live Map, find a nearby alert, and tap{' '}
              <strong>"I Can Help"</strong> to open a temporary chat with the
              person in need.
            </p>
            <button
              onClick={() => setActiveTab('map')}
              className="mt-2 bg-[#b70011] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
              View Live Map
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
