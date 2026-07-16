'use client';

import { useState, useEffect, useCallback } from 'react';
import { postTicket, getTickets } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket';
import type { ServiceTicket } from '@/lib/types';

interface RequestServiceProps {
  roomId: string;
  onClose: () => void;
}

const serviceTypes: {
  type: ServiceTicket['type'];
  emoji: string;
  label: string;
  description: string;
  priority: ServiceTicket['priority'];
  accent: string;
  isEmergency?: boolean;
}[] = [
  {
    type: 'towels',
    emoji: '🛁',
    label: 'Extra Towels',
    description: 'Fresh bath & pool towels',
    priority: 'normal',
    accent: 'border-border/30 bg-surface',
  },
  {
    type: 'water',
    emoji: '💧',
    label: 'Water Bottle',
    description: 'Complimentary still or sparkling',
    priority: 'normal',
    accent: 'border-sky-200 bg-sky-50/50',
  },
  {
    type: 'cleaning',
    emoji: '🧹',
    label: 'Room Cleaning',
    description: 'Housekeeping service',
    priority: 'normal',
    accent: 'border-border/30 bg-surface',
  },
  {
    type: 'buggy',
    emoji: '🚗',
    label: 'Buggy Pickup',
    description: 'Golf cart to your villa',
    priority: 'normal',
    accent: 'border-gold/30 bg-gold/10',
  },
  {
    type: 'emergency',
    emoji: '🆘',
    label: 'Emergency Support',
    description: 'Immediate assistance',
    priority: 'urgent',
    accent: 'border-red-500 bg-red-500/20',
    isEmergency: true,
  },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  new: { color: 'bg-gold/20 text-gold-dark', label: 'New' },
  assigned: { color: 'bg-surface-hover text-foreground-muted', label: 'Assigned' },
  in_progress: { color: 'bg-sky-100 text-sky-700', label: 'In Progress' },
  completed: { color: 'bg-emerald-50 text-emerald-600', label: 'Completed' },
};

export default function RequestService({ roomId }: RequestServiceProps) {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { lastMessage } = useWebSocket();

  const fetchTickets = useCallback(async () => {
    try {
      const data = await getTickets(roomId);
      setTickets(data);
    } catch {
      // Silently handle — tickets section will show empty
    }
  }, [roomId]);

  // Load existing tickets
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Update tickets on WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    if (
      lastMessage.type === 'ticket.updated' ||
      lastMessage.type === 'ticket.created'
    ) {
      fetchTickets();
    }
  }, [lastMessage, fetchTickets]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRequest(
    type: ServiceTicket['type'],
    priority: ServiceTicket['priority'],
  ) {
    setLoadingType(type);
    try {
      const ticket = await postTicket(roomId, type, priority);
      setTickets((prev) => [ticket, ...prev]);
      showToast(
        type === 'emergency'
          ? 'Emergency alert sent — help is on the way'
          : 'Request submitted — we\'re on it!',
        'success',
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to submit request',
        'error',
      );
    } finally {
      setLoadingType(null);
    }
  }

  const pendingTickets = tickets.filter((t) => t.status !== 'completed');
  const completedTickets = tickets.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-6">
      {/* ── Toast ────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 max-w-lg mx-auto z-50 toast-enter">
          <div
            className={`glass-panel-heavy rounded-2xl p-4 border ${
              toast.type === 'success' ? 'border-emerald-200' : 'border-red-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{toast.type === 'success' ? '✓' : '✕'}</span>
              <p className="text-sm text-foreground">{toast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-2xl text-foreground">Request Service</h2>
        <p className="text-sm text-foreground-muted mt-1">
          Tap a service to request instantly
        </p>
      </div>

      {/* ── Service Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {serviceTypes.map((svc) => {
          const isLoading = loadingType === svc.type;
          return (
            <button
              key={svc.type}
              onClick={() => handleRequest(svc.type, svc.priority)}
              disabled={isLoading}
              className={`
                relative rounded-2xl p-5 text-left border-2 transition-all duration-300
                active:scale-[0.96] disabled:opacity-60
                ${svc.accent}
                ${svc.isEmergency ? 'col-span-2' : ''}
              `}
            >
              {isLoading && (
                <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
                  <span className="w-5 h-5 border-2 border-foreground/20 border-t-charcoal rounded-full animate-spin" />
                </div>
              )}
              <span className={`text-3xl block mb-2 ${svc.isEmergency ? 'text-4xl' : ''}`}>
                {svc.emoji}
              </span>
              <h3
                className={`font-display text-foreground leading-tight ${
                  svc.isEmergency ? 'text-lg' : 'text-sm'
                }`}
              >
                {svc.label}
              </h3>
              <p className="text-[11px] text-foreground-muted mt-1">{svc.description}</p>
            </button>
          );
        })}
      </div>

      {/* ── Your Requests ────────────────────────────────────── */}
      {pendingTickets.length > 0 && (
        <div>
          <h3 className="font-display text-base text-foreground mb-3">
            Active Requests
          </h3>
          <div className="space-y-2">
            {pendingTickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.new;
              const svc = serviceTypes.find((s) => s.type === ticket.type);
              return (
                <div
                  key={ticket.id}
                  className="glass-panel rounded-2xl p-4 flex items-center gap-3 animate-fade-in"
                >
                  <span className="text-xl flex-shrink-0">
                    {svc?.emoji ?? '📋'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {svc?.label ?? ticket.type}
                    </p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">
                      {new Date(ticket.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                      {ticket.assignee && ` · ${ticket.assignee}`}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completedTickets.length > 0 && (
        <div>
          <h3 className="font-display text-sm text-foreground-muted mb-2">
            Completed
          </h3>
          <div className="space-y-1.5 opacity-60">
            {completedTickets.slice(0, 5).map((ticket) => {
              const svc = serviceTypes.find((s) => s.type === ticket.type);
              return (
                <div
                  key={ticket.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background-alt/50"
                >
                  <span className="text-sm">{svc?.emoji ?? '📋'}</span>
                  <span className="text-xs text-foreground-muted flex-1 truncate">
                    {svc?.label ?? ticket.type}
                  </span>
                  <span className="text-emerald-500 text-xs">✓</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
