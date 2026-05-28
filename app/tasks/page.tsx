'use client';

import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { DataCard, MetaRow } from '@/components/ui/DataCard';
import { TablePanel } from '@/components/ui/TablePanel';
import { HpButton } from '@/components/ui/HpButton';
import { HpModal } from '@/components/ui/HpModal';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';
import { api, ApiError, swrFetcher } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import {
  AuthenticatedUser,
  Task,
  TaskListResponse,
  TaskStats,
  TaskStatus,
  Priority,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

const TASKS_KEY = '/tasks?parentTaskId=null';

function buildKey(status: string, priority: string, overdue: boolean) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (overdue) params.set('overdue', 'true');
  params.set('limit', '200');
  return `/tasks?${params.toString()}`;
}

function isOverdue(task: Task) {
  return task.deadline && task.status !== 'done' && new Date(task.deadline) < new Date();
}

// ---- Status badge ----
function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = useT();
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-mono ${TASK_STATUS_COLORS[status]}`}>
      {t(`tasks.status_${status}`)}
    </span>
  );
}

// ---- Stats row ----
function StatsRow({ stats }: { stats: TaskStats }) {
  const t = useT();
  const items = [
    { key: 'todo', label: t('tasks.stats_todo'), value: stats.todo, color: 'text-gray-600' },
    { key: 'doing', label: t('tasks.stats_doing'), value: stats.doing, color: 'text-blue-700' },
    { key: 'blocked', label: t('tasks.stats_blocked'), value: stats.blocked, color: 'text-red-600' },
    { key: 'done', label: t('tasks.stats_done'), value: stats.done, color: 'text-green-700' },
    { key: 'overdue', label: t('tasks.stats_overdue'), value: stats.overdue, color: 'text-red-600' },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
      {items.map((item) => (
        <div key={item.key} className="bg-hp-card border border-hp-rule px-4 py-3">
          <p className="eyebrow text-xs text-hp-muted mb-1">{item.label}</p>
          <p className={`font-title text-2xl ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ---- AI Sheet Paste Panel ----
function SheetPastePanel({ onCreated }: { onCreated: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [previews, setPreviews] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    setError('');
    try {
      const res = await api.post<{ previews: any[] }>('/tasks/parse-sheet', { text });
      setPreviews(res.previews);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Parse failed');
    } finally {
      setParsing(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      await api.post('/tasks/bulk-create', { tasks: previews });
      onCreated();
      setOpen(false);
      setText('');
      setPreviews([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <HpButton variant="secondary" onClick={() => setOpen(true)}>
        {t('tasks.paste_sheet')}
      </HpButton>

      <HpModal
        open={open}
        onClose={() => { setOpen(false); setPreviews([]); setText(''); }}
        eyebrow={t('tasks.eyebrow')}
        title={t('tasks.paste_sheet')}
      >
        <div className="px-5 py-5 sm:px-6 space-y-4">
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('tasks.paste_placeholder')}
            className="w-full bg-transparent border border-hp-rule px-3 py-2 text-sm font-body text-hp-body focus:outline-none focus:border-hp-pink"
          />

          {error && <p className="text-xs text-hp-pink">{error}</p>}

          {previews.length === 0 ? (
            <HpButton onClick={handleParse} disabled={parsing || !text.trim()}>
              {parsing ? t('tasks.parsing') : t('tasks.parse_btn')}
            </HpButton>
          ) : (
            <>
              <p className="eyebrow text-xs text-hp-muted">
                {t('tasks.parse_result').replace('{count}', String(previews.length))}
              </p>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {previews.map((p, i) => (
                  <li key={i} className="border border-hp-rule px-3 py-2 text-sm">
                    <p className="font-body text-hp-ink">{p.title}</p>
                    {p.description && <p className="text-xs text-hp-muted mt-0.5">{p.description}</p>}
                    <div className="flex gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 font-mono ${TASK_STATUS_COLORS[p.status as TaskStatus] ?? ''}`}>
                        {TASK_STATUS_LABELS[p.status as TaskStatus] ?? p.status}
                      </span>
                      {p.priority && (
                        <span className="text-[10px] text-hp-muted">{PRIORITY_LABELS[p.priority as Priority] ?? p.priority}</span>
                      )}
                      {p.deadline && (
                        <span className="text-[10px] text-hp-muted">{new Date(p.deadline).toLocaleDateString()}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                <HpButton onClick={handleCreate} disabled={creating}>
                  {creating ? t('tasks.creating') : t('tasks.create_all')}
                </HpButton>
                <HpButton variant="secondary" onClick={() => setPreviews([])}>
                  {t('common.cancel')}
                </HpButton>
              </div>
            </>
          )}
        </div>
      </HpModal>
    </>
  );
}

// ---- Main page ----
export default function TasksPage() {
  const t = useT();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const key = buildKey(filterStatus, filterPriority, filterOverdue);
  const { data, error, isLoading } = useSWR<TaskListResponse>(key, swrFetcher);
  const { data: stats } = useSWR<TaskStats>('/tasks/stats', swrFetcher);

  useEffect(() => { setUser(getStoredUser()); }, []);

  function refresh() {
    mutate(key);
    mutate('/tasks/stats');
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t('tasks.delete_confirm'))) return;
    setDeleting(id);
    try {
      await api.delete(`/tasks/${id}`);
      refresh();
    } finally {
      setDeleting(null);
    }
  }

  function openEdit(task: Task) {
    setEditTask(task);
    setFormOpen(true);
  }

  function openNew() {
    setEditTask(null);
    setFormOpen(true);
  }

  const tasks = data?.items ?? [];
  const isAdminOrLeader = user && ['admin', 'leader', 'supervisor', 'executive'].includes(user.role);

  return (
    <AppShell>
      <div className="flex flex-wrap gap-4 justify-between items-start mb-6">
        <SectionHeader
          eyebrow={t('tasks.eyebrow')}
          title={t('tasks.title')}
          description={t('tasks.description')}
        />
        <div className="flex gap-3 flex-wrap">
          <SheetPastePanel onCreated={refresh} />
          <HpButton onClick={openNew}>{t('tasks.add')}</HpButton>
        </div>
      </div>

      {stats && <StatsRow stats={stats} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-hp-card border border-hp-rule px-3 py-2 text-sm font-body focus:outline-none focus:border-hp-pink"
        >
          <option value="">{t('common.all')} — {t('tasks.filter_status')}</option>
          {(['todo', 'doing', 'blocked', 'done'] as TaskStatus[]).map((s) => (
            <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-hp-card border border-hp-rule px-3 py-2 text-sm font-body focus:outline-none focus:border-hp-pink"
        >
          <option value="">{t('common.all')} — {t('tasks.filter_priority')}</option>
          {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm font-body cursor-pointer">
          <input
            type="checkbox"
            checked={filterOverdue}
            onChange={(e) => setFilterOverdue(e.target.checked)}
            className="accent-hp-pink"
          />
          {t('tasks.filter_overdue_only')}
        </label>
      </div>

      {isLoading && <p className="eyebrow">{t('common.loading')}</p>}
      {error && <p className="text-xs text-hp-pink">Không tải được task.</p>}

      {!isLoading && tasks.length === 0 && (
        <div className="bg-hp-inset p-5 sm:p-7">
          <h3 className="font-title text-lg text-hp-ink">{filterStatus || filterPriority || filterOverdue ? t('tasks.no_match') : t('tasks.empty_title')}</h3>
          {!filterStatus && !filterPriority && !filterOverdue && (
            <p className="mt-2 text-sm text-hp-body">{t('tasks.empty_body')}</p>
          )}
        </div>
      )}

      {tasks.length > 0 && (
        <>
          {/* Mobile cards */}
          <div className="card-list">
            {tasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <DataCard key={task.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <TaskStatusBadge status={task.status} />
                    <PriorityBadge value={task.priority} />
                  </div>
                  <MetaRow label={t('tasks.col_title')}>
                    <span className={overdue ? 'text-red-600' : ''}>{task.title}</span>
                  </MetaRow>
                  {task.description && (
                    <MetaRow label={t('tasks.f_description')}>{task.description.slice(0, 100)}</MetaRow>
                  )}
                  {task.deadline && (
                    <MetaRow label={t('tasks.col_deadline')}>
                      <span className={overdue ? 'text-red-600' : ''}>
                        {overdue && <span className="eyebrow text-[10px]">{t('tasks.overdue_chip')} · </span>}
                        {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    </MetaRow>
                  )}
                  {isAdminOrLeader && task.user && (
                    <MetaRow label={t('tasks.col_assignee')}>{task.user.fullName}</MetaRow>
                  )}
                  <div className="pt-2 mt-1 border-t border-hp-rule flex gap-4">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="eyebrow text-xs text-hp-muted hover:text-hp-ink"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(task.id)}
                      disabled={deleting === task.id}
                      className="eyebrow text-xs text-hp-pink hover:text-hp-ink"
                    >
                      {t('tasks.delete')}
                    </button>
                  </div>
                </DataCard>
              );
            })}
          </div>

          {/* Desktop table */}
          <TablePanel className="table-desktop">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="bg-hp-inset">
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('tasks.col_title')}</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('tasks.col_status')}</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('tasks.col_priority')}</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('tasks.col_deadline')}</th>
                  {isAdminOrLeader && (
                    <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('tasks.col_assignee')}</th>
                  )}
                  <th className="py-3 px-4 border-b border-hp-rule"></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <tr
                      key={task.id}
                      className="bg-hp-card hover:bg-hp-inset transition-colors border-b border-hp-rule"
                    >
                      <td className="py-3 px-4 text-sm text-hp-ink max-w-xs">
                        <span className={overdue ? 'text-red-600' : ''}>{task.title}</span>
                        {task.description && (
                          <p className="text-xs text-hp-muted mt-0.5 truncate max-w-[260px]">{task.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <TaskStatusBadge status={task.status} />
                      </td>
                      <td className="py-3 px-4">
                        <PriorityBadge value={task.priority} />
                      </td>
                      <td className="py-3 px-4 text-sm tabular-nums whitespace-nowrap">
                        {task.deadline ? (
                          <span className={overdue ? 'text-red-600' : 'text-hp-body'}>
                            {overdue && <span className="eyebrow text-[10px] mr-1">{t('tasks.overdue_chip')}</span>}
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-hp-muted">—</span>
                        )}
                      </td>
                      {isAdminOrLeader && (
                        <td className="py-3 px-4 text-sm text-hp-body">{task.user?.fullName ?? '—'}</td>
                      )}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          className="eyebrow text-xs text-hp-muted hover:text-hp-ink mr-4"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(task.id)}
                          disabled={deleting === task.id}
                          className="eyebrow text-xs text-hp-pink hover:text-hp-ink"
                        >
                          {t('tasks.delete')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TablePanel>
        </>
      )}

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        task={editTask}
        onSaved={refresh}
      />
    </AppShell>
  );
}
