import React from 'react';

type Tab = 'dashboard' | 'map' | 'chat';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const navItem = (tab: Tab, icon: string, label: string) => {
    const isActive = active === tab;
    return (
      <button
        onClick={() => onChange(tab)}
        className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-w-[64px] transition-all ${
          isActive ? 'text-white' : 'text-on-surface-variant hover:text-on-surface'
        }`}
        aria-label={label}
      >
        {isActive ? (
          <span className="flex items-center justify-center bg-[#dc2626] text-white rounded-full w-14 h-8">
            <span
              className="material-symbols-outlined text-[22px] leading-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {icon}
            </span>
          </span>
        ) : (
          <span
            className="material-symbols-outlined text-[24px] leading-none"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {icon}
          </span>
        )}
        <span
          className={`text-[11px] font-semibold tracking-wide ${
            isActive ? 'text-[#dc2626]' : 'text-on-surface-variant'
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="flex justify-around items-center bg-surface border-t border-surface-variant shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] h-16 w-full shrink-0 transition-colors">
      {navItem('dashboard', 'warning', 'SOS')}
      {navItem('map', 'map', 'Live Map')}
      {navItem('chat', 'forum', 'Chat')}
    </nav>
  );
}
