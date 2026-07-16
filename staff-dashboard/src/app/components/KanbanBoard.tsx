'use client';

import { useMemo } from 'react';
import { TaskItem, TaskStatus } from '@/lib/types';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  tasks: TaskItem[];
  onUpdateStatus: (
    id: string,
    type: 'order' | 'ticket',
    status: TaskStatus,
    assignee?: string
  ) => void;
  newTaskIds: Set<string>;
}

interface Column {
  title: string;
  statuses: TaskStatus[];
  borderColor: string;
  emptyMessage: string;
}

const COLUMNS: Column[] = [
  {
    title: 'New Requests',
    statuses: ['new'],
    borderColor: 'border-l-gold',
    emptyMessage: 'No new requests — all clear.',
  },
  {
    title: 'In Progress',
    statuses: ['assigned', 'in_progress'],
    borderColor: 'border-l-sage',
    emptyMessage: 'Nothing in progress yet.',
  },
  {
    title: 'Completed',
    statuses: ['completed'],
    borderColor: 'border-l-emerald-400',
    emptyMessage: 'No completed tasks today.',
  },
];

export default function KanbanBoard({
  tasks,
  onUpdateStatus,
  newTaskIds,
}: KanbanBoardProps) {
  const grouped = useMemo(() => {
    const result: Record<string, TaskItem[]> = {};
    COLUMNS.forEach((col) => {
      result[col.title] = tasks
        .filter((t) => col.statuses.includes(t.status))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    });
    return result;
  }, [tasks]);

  return (
    <div className="flex flex-row gap-5 h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory pb-4 scroll-smooth">
      {COLUMNS.map((col) => {
        const items = grouped[col.title] || [];
        return (
          <div key={col.title} className="kanban-column w-full sm:min-w-[320px] lg:w-1/3 shrink-0 snap-center flex flex-col h-full bg-foreground/5 lg:bg-transparent rounded-2xl p-4 lg:p-0"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-foreground/10');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-foreground/10');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('bg-foreground/10');
              const taskId = e.dataTransfer.getData('taskId');
              const taskType = e.dataTransfer.getData('taskType');
              if (taskId && taskType) {
                const targetStatus = col.title === 'In Progress' ? 'in_progress' : col.statuses[0];
                onUpdateStatus(taskId, taskType as 'order' | 'ticket', targetStatus);
              }
            }}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-1 h-5 rounded-full ${
                    col.borderColor === 'border-l-gold'
                      ? 'bg-gold'
                      : col.borderColor === 'border-l-sage'
                      ? 'bg-surface-hover'
                      : 'bg-emerald-400'
                  }`}
                />
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  {col.title}
                </h3>
              </div>
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-foreground/10 text-[11px] font-medium text-foreground-muted tabular-nums">
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-foreground/20 text-sm text-foreground-muted bg-foreground/5">
                  {col.emptyMessage}
                </div>
              ) : (
                items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={onUpdateStatus}
                    isNew={newTaskIds.has(task.id)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
