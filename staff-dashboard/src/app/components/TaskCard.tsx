'use client';

import { useState, useCallback, useEffect } from 'react';
import { TaskItem, TaskStatus } from '@/lib/types';
import { getBill } from '@/lib/api';

interface TaskCardProps {
  task: TaskItem;
  onUpdateStatus: (
    id: string,
    type: 'order' | 'ticket',
    status: TaskStatus,
    assignee?: string
  ) => void;
  isNew?: boolean;
}

const STAFF_MEMBERS = ['Ravi', 'Priya', 'Amit', 'Suman', 'Deepak'];

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  if (isNaN(then)) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function priorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-400';
    case 'high':
      return 'bg-orange-400';
    default:
      return 'bg-gold';
  }
}

function statusBadge(status: TaskStatus): { label: string; classes: string } {
  switch (status) {
    case 'new':
      return {
        label: 'New',
        classes: 'bg-gold/15 text-gold',
      };
    case 'assigned':
      return {
        label: 'Assigned',
        classes: 'bg-blue-50 text-blue-500',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        classes: 'bg-amber-50 text-amber-600',
      };
    case 'completed':
      return {
        label: 'Completed',
        classes: 'bg-emerald-50 text-emerald-600',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        classes: 'bg-red-50 text-red-600',
      };
    default:
      return {
        label: 'Unknown',
        classes: 'bg-gray-50 text-gray-500',
      };
  }
}

export default function TaskCard({ task, onUpdateStatus, isNew }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(task.assignee || '');
  const [billData, setBillData] = useState<any>(null);
  const [loadingBill, setLoadingBill] = useState(false);

  const isBill = task.type === 'ticket' && task.raw && 'type' in task.raw && (task.raw.type === 'bill_request' || task.raw.type === 'ebill_request');
  
  const badge = statusBadge(task.status);
  const typeIcon = task.type === 'order' ? '🍽️' : isBill ? '💳' : '🛎️';
  const borderColor = task.type === 'order' ? 'border-l-gold' : isBill ? 'border-l-indigo-400' : 'border-l-sage';
  const bgClass = isBill ? 'glass-panel !bg-indigo-500/10 !border-indigo-500/20' : 'glass-panel';

  const handleStatusChange = useCallback(
    (newStatus: TaskStatus) => {
      onUpdateStatus(task.id, task.type, newStatus, selectedAssignee || undefined);
    },
    [task.id, task.type, selectedAssignee, onUpdateStatus]
  );

  useEffect(() => {
    if (expanded && task.type === 'ticket' && task.raw && 'type' in task.raw && (task.raw.type === 'bill_request' || task.raw.type === 'ebill_request')) {
      if (!billData) {
        setLoadingBill(true);
        getBill(task.roomId).then(data => {
          setBillData(data);
          setLoadingBill(false);
        }).catch(err => {
          console.error("Failed to fetch bill", err);
          setLoadingBill(false);
        });
      }
    }
  }, [expanded, task, billData]);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.setData('taskType', task.type);
      }}
      className={`task-card ${bgClass} border-l-[3px] ${borderColor} p-4 cursor-grab active:cursor-grabbing ${
        isNew ? 'animate-pulse-glow animate-fade-in' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Top Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-foreground/5 text-xs font-medium text-foreground-muted">
            {task.roomId}{task.guestName ? ` • ${task.guestName}` : ' • Guest'}
          </span>
          <span className="text-sm" title={task.type}>
            {typeIcon}
          </span>
        </div>
        <span className="text-[11px] text-foreground-muted tabular-nums">
          {timeAgo(task.createdAt)}
        </span>
      </div>

      {/* Details */}
      <p className="text-sm text-foreground leading-snug mb-3 line-clamp-2">
        {task.details}
      </p>

      {/* Bottom Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${priorityColor(task.priority)}`} />
          <span className="text-[11px] text-foreground-muted capitalize">
            {task.priority}
          </span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${badge.classes}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div
          className="mt-4 pt-4 border-t border-border animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Full Details */}
          {task.type === 'order' && task.raw && 'items' in task.raw && (
            <div className="mb-4 space-y-1.5">
              <p className="text-[11px] uppercase tracking-widest text-foreground-muted mb-2">
                Order Items
              </p>
              {task.raw.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between text-sm"
                >
                  <div className="flex-1">
                    <span className="text-foreground-muted">
                      {item.quantity}× {item.name}
                    </span>
                    {item.notes && (
                      <p className="text-[11px] text-foreground-muted mt-0.5 italic">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-foreground-muted ml-3 tabular-nums">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {task.type === 'ticket' && task.raw && 'type' in task.raw && (task.raw.type === 'bill_request' || task.raw.type === 'ebill_request') && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-widest text-foreground-muted mb-2">
                Bill Breakdown
              </p>
              {loadingBill ? (
                <div className="text-sm text-foreground-muted animate-pulse">Loading bill details...</div>
              ) : billData ? (
                <div className="bg-foreground/20 p-3 rounded-lg border border-white/5">
                  <div className="space-y-3">
                    {billData.orders?.length > 0 ? billData.orders.flatMap((o: any) => {
                      if (!o.items || o.items.length === 0) {
                        return (
                          <div key={o.id} className="flex justify-between text-sm text-foreground font-medium">
                            <span>1x Previous Order (Item missing)</span>
                            <span>₹{o.total.toFixed(2)}</span>
                          </div>
                        );
                      }
                      return o.items.map((i: any, idx: number) => (
                        <div key={`${o.id}-${idx}`} className="flex justify-between text-sm text-foreground font-medium">
                          <span>{i.quantity}x {i.name}</span>
                          <span>₹{(i.price * i.quantity).toFixed(2)}</span>
                        </div>
                      ));
                    }) : (
                      <div className="text-sm text-foreground-muted">No food & beverage orders.</div>
                    )}
                    
                    <div className="pt-2 border-t border-foreground/10 flex justify-between font-bold text-sm text-foreground">
                      <span>Total</span>
                      <span>₹{(billData.orders?.reduce((sum: number, o: any) => sum + o.total, 0) || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-red-500">Failed to load bill.</div>
              )}
            </div>
          )}

          {task.type === 'ticket' && task.raw && 'notes' in task.raw && task.raw.notes && (
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-widest text-foreground-muted mb-1">
                Notes
              </p>
              <p className="text-sm text-foreground-muted">{task.raw.notes}</p>
            </div>
          )}

          {/* Assignee Selector */}
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-widest text-foreground-muted mb-1.5">
              Assign to
            </label>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/10 text-sm text-foreground focus:outline-none focus:border-gold/40 transition-colors"
            >
              <option value="">Unassigned</option>
              {STAFF_MEMBERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {task.status === 'new' && (
              <>
                <button
                  onClick={() => handleStatusChange('assigned')}
                  className="flex-1 py-2 rounded-lg bg-foreground text-background text-xs font-medium uppercase tracking-wide hover:bg-foreground/90 active:scale-[0.98] transition-all"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="flex-1 py-2 rounded-lg bg-gold/15 text-gold text-xs font-medium uppercase tracking-wide hover:bg-gold/25 active:scale-[0.98] transition-all"
                >
                  Start
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to cancel this? (Guest won't be charged)")) {
                      handleStatusChange('cancelled');
                    }
                  }}
                  className="flex-1 py-2 rounded-lg bg-red-500/15 text-red-500 text-xs font-medium uppercase tracking-wide hover:bg-red-500/25 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
              </>
            )}
            {task.status === 'assigned' && (
              <>
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="flex-1 py-2 rounded-lg bg-foreground text-background text-xs font-medium uppercase tracking-wide hover:bg-foreground/90 active:scale-[0.98] transition-all"
                >
                  Start
                </button>
                <button
                  onClick={() => handleStatusChange('completed')}
                  className="flex-1 py-2 rounded-lg bg-emerald-500/15 text-emerald-600 text-xs font-medium uppercase tracking-wide hover:bg-emerald-500/25 active:scale-[0.98] transition-all"
                >
                  Complete
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to cancel this? (Guest won't be charged)")) {
                      handleStatusChange('cancelled');
                    }
                  }}
                  className="flex-1 py-2 rounded-lg bg-red-500/15 text-red-500 text-xs font-medium uppercase tracking-wide hover:bg-red-500/25 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
              </>
            )}
            {task.status === 'in_progress' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium uppercase tracking-wide hover:bg-emerald-600 active:scale-[0.98] transition-all"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
