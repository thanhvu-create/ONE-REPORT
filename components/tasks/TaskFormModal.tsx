'use client';

import { useState } from 'react';
import { HpModal } from '@/components/ui/HpModal';
import { HpInput } from '@/components/ui/HpInput';
import { HpButton } from '@/components/ui/HpButton';
import { api, ApiError } from '@/lib/api';
import { Task, TaskStatus, Priority, TASK_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  onSaved: () => void;
}

const STATUSES: TaskStatus[] = ['todo', 'doing', 'blocked', 'done'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

export function TaskFormModal({ open, onClose, task, onSaved }: Props) {
  const t = useT();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [deadline, setDeadline] = useState(
    task?.deadline ? task.deadline.slice(0, 10) : '',
  );
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form when task changes
  useState(() => {
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus(task?.status ?? 'todo');
    setPriority(task?.priority ?? 'medium');
    setDeadline(task?.deadline ? task.deadline.slice(0, 10) : '');
    setStatusNote('');
    setError('');
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Tiêu đề không được để trống'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        deadline: deadline || undefined,
        statusNote: statusNote.trim() || undefined,
      };
      if (isEdit) {
        await api.patch(`/tasks/${task!.id}`, body);
      } else {
        await api.post('/tasks', body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('tasks.save_error'));
    } finally {
      setSaving(false);
    }
  }

  const statusChanged = isEdit && status !== task?.status;

  return (
    <HpModal
      open={open}
      onClose={onClose}
      eyebrow={t('tasks.eyebrow')}
      title={isEdit ? t('tasks.edit') : t('tasks.new')}
    >
      <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-6 space-y-5">
        <HpInput
          label={t('tasks.f_title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={255}
        />

        <div className="mb-4">
          <label className="block eyebrow mb-2">{t('tasks.f_description')}</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent border border-hp-rule px-3 py-2 text-sm font-body text-hp-body focus:outline-none focus:border-hp-pink transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block eyebrow mb-2">{t('tasks.f_status')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full bg-hp-card border border-hp-rule px-3 py-2 text-sm font-body focus:outline-none focus:border-hp-pink"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block eyebrow mb-2">{t('tasks.f_priority')}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full bg-hp-card border border-hp-rule px-3 py-2 text-sm font-body focus:outline-none focus:border-hp-pink"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>
        </div>

        <HpInput
          label={t('tasks.f_deadline')}
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        {statusChanged && (
          <HpInput
            label={t('tasks.f_status_note')}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="Lý do thay đổi trạng thái (tuỳ chọn)"
          />
        )}

        {error && <p className="text-xs text-hp-pink">{error}</p>}

        <div className="flex gap-3 pt-2 border-t border-hp-rule">
          <HpButton type="submit" disabled={saving}>
            {saving ? t('tasks.saving') : t('tasks.save')}
          </HpButton>
          <HpButton type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </HpButton>
        </div>
      </form>
    </HpModal>
  );
}
