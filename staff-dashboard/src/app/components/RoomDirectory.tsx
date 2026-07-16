import React, { useState } from 'react';
import { TaskItem } from '@/lib/types';
import TaskCard from './TaskCard';
import { checkoutRoom } from '@/lib/api';

interface RoomDirectoryProps {
  tasks: TaskItem[];
  onUpdateStatus: (id: string, type: 'order' | 'ticket', status: string, assignee?: string) => Promise<void>;
  newTaskIds: Set<string>;
  activeSessions?: any[];
}

export default function RoomDirectory({ tasks, onUpdateStatus, newTaskIds, activeSessions = [] }: RoomDirectoryProps) {
  // Group tasks by roomId
  const rooms = React.useMemo(() => {
    const grouped: Record<string, TaskItem[]> = {};
    tasks.forEach(task => {
      // Exclude completed or cancelled tasks from active room tab
      if (task.status === 'completed' || task.status === 'cancelled') return;
      if (!grouped[task.roomId]) {
        grouped[task.roomId] = [];
      }
      grouped[task.roomId].push(task);
    });
    return grouped;
  }, [tasks]);

  const activeRooms = React.useMemo(() => {
    const active = new Set<string>();
    activeSessions.forEach(session => active.add(session.room_id));
    Object.keys(rooms).forEach(roomId => active.add(roomId));
    return Array.from(active).sort();
  }, [activeSessions, rooms]);

  if (activeRooms.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-foreground-muted">
        <span className="text-4xl mb-4">🏨</span>
        <h3 className="text-xl font-display font-medium text-foreground mb-2">No Active Rooms</h3>
        <p className="max-w-sm mx-auto">There are no active orders or service requests at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activeRooms.map(roomId => {
        const roomTasks = rooms[roomId] || [];
        const totalPendingValue = roomTasks.reduce((sum, task) => {
          if (task.type === 'order' && 'total' in task.raw) {
            return sum + (task.raw.total || 0);
          }
          return sum;
        }, 0);

        return (
          <div key={roomId} className="glass-panel-heavy rounded-3xl p-6 border border-surface shadow-sm">
            <div className="flex items-center justify-between mb-6 border-b border-surface pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-gold/20 text-gold-dark flex items-center justify-center font-bold font-display text-lg">
                  {roomId}
                </span>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Room {roomId}</h3>
                  <p className="text-xs text-foreground-muted">{roomTasks.length} active request{roomTasks.length !== 1 && 's'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-foreground-muted mb-1">Active Tab</p>
                <p className="text-xl font-display font-medium text-gold-dark mb-2">₹{totalPendingValue.toFixed(2)}</p>
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to checkout Room ${roomId}? This will log the guest out of the portal.`)) {
                      try {
                        await checkoutRoom(roomId);
                        alert(`Room ${roomId} checked out successfully.`);
                        window.location.reload();
                      } catch (err: any) {
                        alert('Failed to checkout room: ' + err.message);
                      }
                    }
                  }}
                  className="text-xs px-3 py-1.5 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                >
                  Checkout Guest
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {roomTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdateStatus={onUpdateStatus}
                  isNew={newTaskIds.has(task.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
