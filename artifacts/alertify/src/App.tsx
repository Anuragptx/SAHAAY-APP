import React, { useState } from 'react';
import SOSDashboard from './pages/SOSDashboard';
import LiveMap from './pages/LiveMap';
import ChatList from './pages/ChatList';
import Chat from './pages/Chat';
import BottomNav from './components/BottomNav';
import { type AlertCategory } from './lib/firebase';
import { useTheme } from './lib/theme';

type Tab = 'dashboard' | 'map' | 'chat';

// Inject Google Fonts + Material Symbols once
const link1 = document.createElement('link');
link1.rel = 'preconnect';
link1.href = 'https://fonts.googleapis.com';
document.head.appendChild(link1);

const link2 = document.createElement('link');
link2.rel = 'stylesheet';
link2.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
document.head.appendChild(link2);

const link3 = document.createElement('link');
link3.rel = 'stylesheet';
link3.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap';
document.head.appendChild(link3);

interface ActiveChat {
  alertId: string;
  category: AlertCategory;
  expiresAt: Date | null;
}

export default function App() {
  const { isDark, toggleDark }        = useTheme();
  const [activeTab, setActiveTab]     = useState<Tab>('dashboard');
  const [activeChat, setActiveChat]   = useState<ActiveChat | null>(null);
  const [lastAlertId, setLastAlertId] = useState<string | undefined>();

  const handleAlertBroadcast = (alertId: string, _category: AlertCategory) => {
    setLastAlertId(alertId);
    setTimeout(() => setActiveTab('map'), 600);
  };

  const openChat = (alertId: string, category: AlertCategory, expiresAt: Date | null = null) => {
    setActiveChat({ alertId, category, expiresAt });
    setActiveTab('chat');
  };

  const closeChat = () => {
    setActiveChat(null);
    setActiveTab('chat');
  };

  // Full-screen chat view (no bottom nav)
  if (activeTab === 'chat' && activeChat) {
    return (
      <div className="flex flex-col h-full">
        <Chat
          alertId={activeChat.alertId}
          category={activeChat.category}
          expiresAt={activeChat.expiresAt}
          isDark={isDark}
          toggleDark={toggleDark}
          onBack={closeChat}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && (
          <SOSDashboard
            onAlertBroadcast={handleAlertBroadcast}
            isDark={isDark}
            toggleDark={toggleDark}
          />
        )}
        {activeTab === 'map' && (
          <LiveMap
            activeAlertId={lastAlertId}
            isDark={isDark}
            toggleDark={toggleDark}
            onOpenChat={(id, cat, exp) => openChat(id, cat, exp)}
          />
        )}
        {activeTab === 'chat' && !activeChat && (
          <ChatList onJoin={openChat} isDark={isDark} toggleDark={toggleDark} />
        )}
      </div>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
