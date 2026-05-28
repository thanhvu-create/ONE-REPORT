'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HpButton } from '@/components/ui/HpButton';
import { HpInput } from '@/components/ui/HpInput';
import { HpModal } from '@/components/ui/HpModal';
import { UserDirectory } from '@/components/admin/UserDirectory';
import { api, ApiError, swrFetcher } from '@/lib/api';
import { Department, Role, UserRecord } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

interface Draft {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  departmentId: string;
  isActive: boolean;
}

const EMPTY_DRAFT: Draft = {
  fullName: '',
  email: '',
  password: '',
  role: 'employee',
  departmentId: '',
  isActive: true,
};

type StatusFilter = '' | 'active' | 'inactive';

function UserStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-hp-card border border-hp-rule px-3 py-3 sm:px-4 sm:py-4">
      <span className="block eyebrow mb-1 text-[10px]">{label}</span>
      <span className="font-title text-2xl text-hp-ink tabular-nums sm:text-3xl">{value}</span>
    </div>
  );
}

export default function UsersAdmin() {
  const t = useT();
  const { data: users, isLoading, mutate } = useSWR<UserRecord[]>('/users', swrFetcher);
  const { data: departments } = useSWR<Department[]>('/departments', swrFetcher);

  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  const stats = useMemo(() => {
    const list = users ?? [];
    return {
      total: list.length,
      active: list.filter((u) => u.isActive).length,
      leaders: list.filter((u) => u.role === 'leader' || u.role === 'supervisor' || u.role === 'executive').length,
      admins: list.filter((u) => u.role === 'admin').length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const list = users ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      const matchSearch =
        !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus =
        statusFilter === '' ||
        (statusFilter === 'active' ? u.isActive : !u.isActive);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  function openCreateModal() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(u: UserRecord) {
    setEditing(u);
    setDraft({
      fullName: u.fullName,
      email: u.email,
      password: '',
      role: u.role,
      departmentId: u.departmentId?.toString() ?? '',
      isActive: u.isActive,
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: draft.fullName,
        email: draft.email,
        role: draft.role,
        isActive: draft.isActive,
        departmentId: draft.departmentId ? Number(draft.departmentId) : null,
      };
      if (draft.password) payload.password = draft.password;
      if (editing) {
        await api.patch(`/users/${editing.id}`, payload);
      } else {
        if (!draft.password) throw new Error(t('users.pwd_required'));
        await api.post('/users', payload);
      }
      await mutate();
      closeModal();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectClass =
    'w-full min-h-[44px] bg-hp-card border border-hp-rule px-3 py-2 text-sm text-hp-body font-body focus:outline-none focus:border-hp-pink';

  return (
    <AppShell requiredRoles={['admin']}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 mb-6 sm:mb-8">
        <div className="min-w-0 flex-1 [&>div]:mb-0">
          <SectionHeader
            eyebrow={t('users.eyebrow')}
            title={t('users.title')}
            description={t('users.description')}
          />
        </div>
        <HpButton type="button" onClick={openCreateModal} className="w-full sm:w-auto shrink-0">
          {t('users.add_user')}
        </HpButton>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5 sm:grid-cols-4 sm:gap-3 sm:mb-6">
        <UserStat label={t('users.stats_total')} value={stats.total} />
        <UserStat label={t('users.stats_active')} value={stats.active} />
        <UserStat label={t('users.stats_managers')} value={stats.leaders} />
        <UserStat label={t('users.stats_admins')} value={stats.admins} />
      </div>

      <div className="mb-2">
        <span className="eyebrow">{t('users.directory')}</span>
      </div>
      <UserDirectory
        filtered={filtered}
        total={stats.total}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedId={modalOpen && editing ? editing.id : null}
        onSelect={openEditModal}
      />

      <HpModal
        open={modalOpen}
        onClose={closeModal}
        eyebrow={editing ? t('users.edit_user') : t('users.new_user')}
        title={editing ? editing.fullName : t('users.create')}
        subtitle={editing?.email}
      >
        <form onSubmit={save} className="p-5 sm:p-6 space-y-8">
          <div>
            <h4 className="eyebrow mb-4 pb-2 border-b border-hp-rule">{t('users.section_identity')}</h4>
            <HpInput
              label={t('users.full_name')}
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              required
            />
            <HpInput
              label={t('users.email')}
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              required
            />
            <div className="mb-6">
              <label className="block eyebrow mb-2">{t('users.department')}</label>
              <select
                aria-label={t('users.department')}
                value={draft.departmentId}
                onChange={(e) => setDraft({ ...draft, departmentId: e.target.value })}
                className={selectClass}
              >
                <option value="">{t('common.none')}</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h4 className="eyebrow mb-4 pb-2 border-b border-hp-rule">{t('users.section_access')}</h4>
            <div className="mb-6">
              <label className="block eyebrow mb-2">{t('users.role')}</label>
              <div className="flex flex-wrap gap-2">
                {(['employee', 'leader', 'supervisor', 'executive', 'admin'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDraft({ ...draft, role: r })}
                    className={`uppercase tracking-eyebrow text-[10px] px-3 py-2 border min-h-[40px] transition-colors ${
                      draft.role === r
                        ? 'border-hp-pink text-hp-pink bg-hp-pink/5'
                        : 'border-hp-rule text-hp-muted hover:text-hp-ink hover:border-hp-ink/30'
                    }`}
                  >
                    {t(`role.${r}`)}
                  </button>
                ))}
              </div>
            </div>

            <HpInput
              label={editing ? t('users.password_edit') : t('users.password')}
              type="password"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              minLength={4}
              required={!editing}
            />

            <label className="flex items-center justify-between gap-4 min-h-[44px] border border-hp-rule px-4 py-3 bg-hp-inset/30 cursor-pointer">
              <span className="text-sm text-hp-body">{t('users.active')}</span>
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
            <p className="mt-2 text-xs text-hp-muted">
              {draft.isActive ? t('users.status_active') : t('users.status_inactive')}
            </p>
          </div>

          {error && (
            <p className="text-xs text-hp-pink border-l-2 border-hp-pink pl-3 break-words">{error}</p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center border-t border-hp-rule">
            <HpButton type="submit" loading={busy} loadingLabel={t('common.saving')} className="w-full sm:w-auto">
              {editing ? t('users.save') : t('users.create')}
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
