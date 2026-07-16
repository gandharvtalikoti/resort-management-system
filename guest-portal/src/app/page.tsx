'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [roomName, setRoomName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedRoom = roomName.trim().toLowerCase();
    const trimmedGuest = guestName.trim();
    if (!trimmedRoom || !trimmedGuest) return;
    
    // Save guest name for the portal to pick up
    localStorage.setItem(`guestName_${trimmedRoom}`, trimmedGuest);
    
    setIsNavigating(true);
    router.push(`/r/${encodeURIComponent(trimmedRoom)}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl p-8 sm:p-12 w-full max-w-md animate-fade-in">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="Buddha Village Logo" className="h-20 w-auto object-contain animate-pulse-glow" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <p className="text-foreground-muted text-sm leading-relaxed max-w-xs mx-auto">
            Welcome to your sanctuary of serenity. Enter your room name to
            access your personal guest portal.
          </p>
        </div>

        {/* Room Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="room-name"
              className="block text-xs font-medium text-foreground-muted uppercase tracking-widest mb-2"
            >
              Room Name
            </label>
            <input
              id="room-name"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. DHYANA"
              autoComplete="off"
              className="w-full px-4 py-3.5 bg-background-alt border border-surface rounded-2xl text-center text-2xl font-display tracking-wider text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-300"
            />
          </div>

          <div>
            <label
              htmlFor="guest-name"
              className="block text-xs font-medium text-foreground-muted uppercase tracking-widest mb-2"
            >
              Guest Name
            </label>
            <input
              id="guest-name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. John Doe"
              autoComplete="name"
              className="w-full px-4 py-3.5 bg-background-alt border border-surface rounded-2xl text-center text-2xl font-display tracking-wider text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={!roomName.trim() || !guestName.trim() || isNavigating}
            className="w-full py-3.5 rounded-2xl font-medium text-sm tracking-wide transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-foreground text-background hover:bg-foreground-muted active:scale-[0.98]"
          >
            {isNavigating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Entering…
              </span>
            ) : (
              'Enter Room'
            )}
          </button>
        </form>

        {/* Demo Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsNavigating(true);
              router.push('/r/101');
            }}
            className="text-xs text-gold hover:text-gold-dark transition-colors duration-200 underline underline-offset-4 decoration-gold/30 hover:decoration-gold-dark/50"
          >
            Try demo room → 101
          </button>
        </div>

        {/* Footer Tagline */}
        <p className="mt-8 text-center text-[10px] text-foreground-muted/50 uppercase tracking-[0.2em]">
          Love · Live · Live
        </p>
      </div>
    </main>
  );
}
