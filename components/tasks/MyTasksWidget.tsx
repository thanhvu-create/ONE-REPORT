'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { Task, TaskListResponse, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

function isOverdue(task: Task): boolean {
  if (!task.deadline || task.status === 'done') return false;
  return new Date(task.deadline) < new Date();
}

export function MyTasksWidget() {
  const t = useT();
  const { data, isLoading } = useSWR<TaskListResponse>(
    '/tasks?limit=5&status=todo&status=doing&status=blocked',
    swrFetcher,
  );

  if (isLoading) return null;

  const tasks = data?.items ?? [];
  const urgent = tasks.filter((t) => isOverdue(t) || t.status === 'blocked' || t.priority === 'urgent');
  const displayed = urgent.length > 0 ? urgent.slice(0, 5) : tasks.slice(0, 5);

  return (
    <div className="bg-hp-card border border-hp-rule p-5">
      <p className="eyebrow text-xs text-hp-muted mb-3">{t('tasks.my_tasks')}</p>

      {displayed.length === 0 ? (
        <p className="text-sm text-hp-muted">{t('tasks.my_tasks_empty')}</p>
      ) : (
        <ul className="space-y-2">
          {displayed.map((task) => {
            const overdue = isOverdue(task);
            return (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`shrink-0 mt-0.5 inline-block px-1.5 py-0.5 text-[10px] font-mono leading-tight ${TASK_STATUS_COLORS[task.status]}`}
                >
                  {TASK_STATUS_LABELS[task.status]}
                </span>
                <div className="min-w-0">
                  <p className="text-hp-ink truncate">{task.title}</p>
                  {task.deadline && (
                    <p className={`text-xs mt-0.5 ${overdue ? 'text-red-600' : 'text-hp-muted'}`}>
                      {overdue && <span className="eyebrow">{t('tasks.overdue_chip')} · </span>}
                      {new Date(task.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/tasks"
        className="inline-block eyebrow text-xs text-hp-pink hover:text-hp-ink transition-colors mt-3"
      >
        {t('tasks.view_all')}
      </Link>
    </div>
  );
}
