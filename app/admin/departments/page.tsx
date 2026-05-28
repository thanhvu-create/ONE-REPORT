'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HpButton } from '@/components/ui/HpButton';
import { HpInput } from '@/components/ui/HpInput';
import { HpModal } from '@/components/ui/HpModal';
import {
  DepartmentDirectory,
  DepartmentRow,
  OccupancyFilter,
} from '@/components/admin/DepartmentDirectory';
import { api, ApiError, swrFetcher } from '@/lib/api';
import { Department, UserRecord } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

interface Draft {
  name: string;
  description: string;
}

const EMPTY: Draft = { name: '', description: '' };

function DeptStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-hp-card border border-hp-rule px-3 py-3 sm:px-4 sm:py-4">
      <span className="block eyebrow mb-1 text-[10px]">{label}</span>
      <span className="font-title text-2xl text-hp-ink tabular-nums sm:text-3xl">{value}</span>
    </div>
  );
}

export default function DepartmentsAdmin() {
  const t = useT();
  const { data: list, isLoading, mutate } = useSWR<Department[]>('/departments', swrFetcher);
  const { data: users } = useSWR<UserRecord[]>('/users', swrFetcher);

  const [editing, setEditing] = useState<Department | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [occupancy, setOccupancy] = useState<OccupancyFilter>('');

  const rows: DepartmentRow[] = useMemo(() => {
    const userByDept = new Map<number, number>();
    for (const u of users ?? []) {
      if (u.departmentId !== null) {
        userByDept.set(u.departmentId, (userByDept.get(u.departmentId) ?? 0) + 1);
      }
    }
    return (list ?? []).map((d) => ({ ...d, userCount: userByDept.get(d.id) ?? 0 }));
  }, [list, users]);

  const stats = useMemo(() => {
    const total = rows.length;
    const assignedUsers = rows.reduce((sum, d) => sum + d.userCount, 0);
    const withUsers = rows.filter((d) => d.userCount > 0).length;
    const empty = total - withUsers;
    return { total, assignedUsers, withUsers, empty };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((d) => {
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q);
      const matchOcc =
        occupancy === '' ||
        (occupancy === 'has_users' ? d.userCount > 0 : d.userCount === 0);
      return matchSearch && matchOcc;
    });
  }, [rows, search, occupancy]);

  function openCreateModal() {
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(d: DepartmentRow) {
    setEditing(d);
    setDraft({ name: d.name, description: d.description ?? '' });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = { name: draft.name.trim(), description: draft.description.trim() || undefined };
      if (editing) {
        await api.patch(`/departments/${editing.id}`, payload);
      } else {
        await api.post('/departments', payload);
      }
      await mutate();
      closeModal();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('depts.cannot_save'));
    } finally {
      setBusy(false);
    }
  }

  const currentUserCount = editing ? (rows.find((r) => r.id === editing.id)?.userCount ?? 0) : 0;

  return (
    <AppShell requiredRoles={['admin']}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 mb-6 sm:mb-8">
        <div className="min-w-0 flex-1 [&>div]:mb-0">
          <SectionHeader
            eyebrow={t('depts.eyebrow')}
            title={t('depts.title')}
            description={t('depts.description')}
          />
        </div>
        <HpButton type="button" onClick={openCreateModal} className="w-full sm:w-auto shrink-0">
          {t('depts.add_department')}
        </HpButton>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5 sm:grid-cols-4 sm:gap-3 sm:mb-6">
        <DeptStat label={t('depts.stats_total')} value={stats.total} />
        <DeptStat label={t('depts.stats_users')} value={stats.assignedUsers} />
        <DeptStat label={t('depts.stats_with_users')} value={stats.withUsers} />
        <DeptStat label={t('depts.stats_empty')} value={stats.empty} />
      </div>

      <div className="mb-2">
        <span className="eyebrow">{t('depts.directory')}</span>
      </div>
      <DepartmentDirectory
        filtered={filtered}
        total={stats.total}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        occupancy={occupancy}
        onOccupancyChange={setOccupancy}
        selectedId={modalOpen && editing ? editing.id : null}
        onSelect={openEditModal}
      />

      <HpModal
        open={modalOpen}
        onClose={closeModal}
        eyebrow={editing ? t('depts.edit') : t('depts.new')}
        title={editing ? editing.name : t('depts.create')}
        subtitle={editing?.description ?? undefined}
      >
        <form onSubmit={save} className="p-5 sm:p-6 space-y-6">
          <HpInput
            label={t('depts.name')}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            required
            autoFocus
          />
          <div className="mb-2">
            <label htmlFor="dept-desc" className="block eyebrow mb-2">{t('depts.description_label')}</label>
            <textarea
              id="dept-desc"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={4}
              placeholder={t('depts.description_placeholder')}
              className="w-full bg-transparent border border-hp-rule p-3 text-hp-body font-body text-base sm:text-sm focus:outline-none focus:border-hp-pink"
            />
          </div>

          {editing && (
            <p className="text-xs text-hp-muted">
              {t('depts.user_count_helper', { count: currentUserCount })}
            </p>
          )}

          {error && (
            <p className="text-xs text-hp-pink border-l-2 border-hp-pink pl-3 break-words">{error}</p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center border-t border-hp-rule">
            <HpButton type="submit" loading={busy} loadingLabel={t('common.saving')} className="w-full sm:w-auto">
              {editing ? t('depts.save') : t('depts.create')}
            </HpButton>
            <button
              type="button"
              onClick={closeModal}
              className="eyebrow text-hp-muted hover:text-hp-ink min-h-[44px] px-2"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </HpModal>
    </AppShell>
  );
}
