'use client';

interface LiveIndicatorProps {
  isConnected: boolean;
}

export default function LiveIndicator({ isConnected }: LiveIndicatorProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60">
      <div
        className={`pulse-dot ${
          isConnected ? 'bg-emerald-500' : 'bg-red-400'
        }`}
      />
      <span
        className={`text-xs font-medium tracking-wide ${
          isConnected ? 'text-emerald-600' : 'text-red-400'
        }`}
      >
        {isConnected ? 'Live' : 'Reconnecting…'}
      </span>
    </div>
  );
}
