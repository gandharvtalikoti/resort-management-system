'use client';

import { useState, useEffect, useCallback } from 'react';
import { CartProvider } from '@/lib/store';
import { useWebSocket } from '@/lib/websocket';
import { checkSession, joinSession } from '@/lib/api';
import OrderFood from './OrderFood';
import RequestService from './RequestService';
import BookAmenities from './BookAmenities';
import ViewBill from './ViewBill';
import GuestDeclaration from './GuestDeclaration';

type Panel = 'order' | 'service' | 'amenities' | 'bill' | null;
type AppState = 'initializing' | 'enter_name' | 'declaration' | 'portal' | 'occupied';

const actionCards: {
  panel: Exclude<Panel, null>;
  emoji: string;
  label: string;
  sub: string;
  accent: string;
  border: string;
}[] = [
  {
    panel: 'order',
    emoji: '🍽️',
    label: 'Order Food',
    sub: 'Breakfast · Drinks · Poolside',
    accent: 'bg-gold/10',
    border: 'border-gold/30 hover:border-gold/60',
  },
  {
    panel: 'service',
    emoji: '🛎️',
    label: 'Request Service',
    sub: 'Towels · Cleaning · Buggy',
    accent: 'bg-surface',
    border: 'border-surface-hover/30 hover:border-surface-hover/60',
  },
  {
    panel: 'amenities',
    emoji: '🧘',
    label: 'Book Amenities',
    sub: 'Spa · Jacuzzi · Yoga',
    accent: 'bg-gold-dark/10',
    border: 'border-gold-dark/30 hover:border-gold-dark/60',
  },
  {
    panel: 'bill',
    emoji: '💳',
    label: 'View Bill',
    sub: 'Orders · Services · Call Waiter',
    accent: 'bg-foreground/5',
    border: 'border-foreground/10 hover:border-foreground/30',
  },
];

export default function GuestPortal({ roomId }: { roomId: string }) {
  const [appState, setAppState] = useState<AppState>('initializing');
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [guestName, setGuestName] = useState<string>('');
  const [occupantName, setOccupantName] = useState<string>('');
  const { isConnected, lastMessage } = useWebSocket();

  // Initialization & Session Check
  useEffect(() => {
    async function init() {
      try {
        const { active, session } = await checkSession(roomId);
        const localToken = localStorage.getItem(`session_${roomId}`);
        const localName = localStorage.getItem(`guestName_${roomId}`);

        if (active && session) {
          if (localToken === session.id) {
            // Authorized guest
            setGuestName(localName || session.guest_name);
            setAppState('portal');
          } else {
            // Someone else is checked in
            setOccupantName(session.guest_name);
            setAppState('occupied');
          }
        } else {
          // No active session, ready for new check-in
          // Clean up old tokens if any
          localStorage.removeItem(`session_${roomId}`);
          
          if (localName) {
             setGuestName(localName);
             setAppState('declaration');
          } else {
             setAppState('enter_name');
          }
        }
      } catch (err) {
        console.error('Failed to check session', err);
        // Fallback to name entry if backend fails
        setAppState('enter_name');
      }
    }
    init();
  }, [roomId]);

  // Live clock
  useEffect(() => {
    function updateTime() {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      );
    }
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  if (appState === 'initializing') {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-gold-dark border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (appState === 'occupied') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="glass-panel p-8 max-w-sm w-full rounded-3xl text-center border border-surface shadow-xl">
          <span className="text-4xl block mb-4">🔒</span>
          <h1 className="font-display text-xl text-foreground mb-2">Room Occupied</h1>
          <p className="text-sm text-foreground-muted mb-6">
            Room {roomId} is currently checked in. To join this session on a second device, please enter the name of the registered guest.
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get('guestName') as string;
            if (name.trim()) {
              try {
                const res = await joinSession(roomId, name.trim());
                localStorage.setItem(`session_${roomId}`, res.session_token);
                localStorage.setItem(`guestName_${roomId}`, name.trim());
                setGuestName(name.trim());
                setAppState('portal');
              } catch (err: any) {
                alert('Invalid guest name or session expired.');
              }
            }
          }}>
            <input 
              name="guestName"
              placeholder="Registered Guest Name" 
              required
              className="w-full px-4 py-3 bg-background-alt border border-surface rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-gold/50 font-medium text-center text-foreground placeholder:text-foreground-muted/50"
            />
            <button type="submit" className="w-full py-3 bg-gold-dark text-background rounded-xl shadow-md font-medium hover:bg-gold-dark/90 transition-colors">
              Join Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (appState === 'enter_name') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="glass-panel p-8 max-w-sm w-full rounded-3xl animate-slide-up text-center border border-surface shadow-xl">
          <img src="/logo.png" alt="Buddha Village Logo" className="h-20 w-auto mx-auto mb-4 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <h1 className="font-display text-2xl text-foreground mb-2">Welcome to {roomId}</h1>
          <p className="text-sm text-foreground-muted mb-8">Please enter your name to begin check-in.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get('guestName') as string;
            if (name.trim()) {
              localStorage.setItem(`guestName_${roomId}`, name.trim());
              setGuestName(name.trim());
              setAppState('declaration');
            }
          }}>
            <input 
              name="guestName"
              placeholder="Your Name" 
              required
              autoComplete="name"
              className="w-full px-4 py-3 bg-background-alt border border-surface rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-gold/50 font-medium text-center text-foreground placeholder:text-foreground-muted/50"
            />
            <button type="submit" className="w-full py-3 bg-gold-dark text-background rounded-xl shadow-md font-medium hover:bg-gold-dark/90 transition-colors">
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (appState === 'declaration') {
    return (
      <GuestDeclaration 
        roomId={roomId} 
        guestName={guestName} 
        onComplete={() => setAppState('portal')} 
      />
    );
  }

  return (
    <CartProvider>
      <div className="min-h-screen max-w-lg mx-auto px-4 py-6 sm:py-8 relative">
        {/* ── Welcome Header ─────────────────────────────────────── */}
        <header className="glass-panel rounded-3xl p-6 mb-6 animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Buddha Village" className="h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-foreground">
                  Room {roomId} • {guestName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-display text-foreground tabular-nums">
                {currentTime}
              </p>
              <div className="flex items-center gap-1.5 mt-1 justify-end">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                    isConnected ? 'bg-emerald-400' : 'bg-red-500/80'
                  }`}
                />
                <span className="text-[10px] text-foreground-muted">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* WebSocket status toast */}
          {lastMessage && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-foreground-muted truncate">
                <span className="text-gold mr-1">↯</span>
                {lastMessage.type}
              </p>
            </div>
          )}
        </header>

        {/* ── Action Grid ────────────────────────────────────────── */}
        {activePanel === null && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {actionCards.map((card, i) => (
              <button
                key={card.panel}
                onClick={() => setActivePanel(card.panel)}
                className={`
                  group relative rounded-3xl p-5 sm:p-6 text-left
                  border-2 transition-all duration-300
                  active:scale-[0.97] ${card.accent} ${card.border}
                `}
                style={{
                  animationDelay: `${i * 80}ms`,
                  animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  opacity: 0,
                }}
              >
                <span className="text-3xl sm:text-4xl block mb-3 group-hover:scale-110 transition-transform duration-300">
                  {card.emoji}
                </span>
                <h2 className="font-display text-base sm:text-lg text-foreground leading-tight">
                  {card.label}
                </h2>
                <p className="text-[11px] text-foreground-muted mt-1 leading-snug">
                  {card.sub}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* ── Active Panel ───────────────────────────────────────── */}
        {activePanel !== null && (
          <div className="animate-slide-up">
            {/* Back Button */}
            <button
              onClick={closePanel}
              className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground mb-4 transition-colors duration-200 group"
            >
              <svg
                className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to menu
            </button>

            {activePanel === 'order' && (
              <OrderFood roomId={roomId} onClose={closePanel} />
            )}
            {activePanel === 'service' && (
              <RequestService roomId={roomId} onClose={closePanel} />
            )}
            {activePanel === 'amenities' && (
              <BookAmenities roomId={roomId} onClose={closePanel} />
            )}
            {activePanel === 'bill' && (
              <ViewBill roomId={roomId} onClose={closePanel} />
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer className="mt-8 text-center">
          <p className="text-[10px] text-foreground-muted/30 uppercase tracking-[0.2em]">
            Buddha Village Resort · Guest Portal
          </p>
        </footer>
      </div>
    </CartProvider>
  );
}
