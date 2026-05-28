'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HpButton } from '@/components/ui/HpButton';
import { HpModal } from '@/components/ui/HpModal';
import { HpInput } from '@/components/ui/HpInput';
import { api, ApiError, swrFetcher } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { AuthenticatedUser, Department, Position } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

export default function PositionsPage() {
  const t = useT();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    setUser(u);
    if (u && u.role !== 'admin' && u.departmentId) {
      setSelectedDeptId(u.departmentId);
    }
  }, []);

  const isAdmin = user?.role === 'admin';
  const { data: departments } = useSWR<Department[]>(isAdmin ? '/departments' : null, swrFetcher);

  // default first dept for admin
  useEffect(() => {
    if (isAdmin && departments && departments.length > 0 && selectedDeptId === null) {
      setSelectedDeptId(departments[0].id);
    }
  }, [isAdmin, departments, selectedDeptId]);

  const positionsKey = selectedDeptId ? `/positions?departmentId=${selectedDeptId}` : null;
  const { data: positions, mutate, isLoading } = useSWR<Position[]>(positionsKey, swrFetcher);

  const canEdit = user?.role === 'admin' || user?.role === 'leader';

  return (
    <AppShell>
      <div className="flex flex-wrap items-end gap-6 justify-between mb-2">
        <SectionHeader
          eyebrow={t('positions.eyebrow')}
          title={t('positions.title')}
          description={t('positions.description')}
        />
        {canEdit && (
          <HpButton type="button" variant="secondary" onClick={() => setShowCreate(true)}>
            {t('positions.add')}
          </HpButton>
        )}
      </div>

      {isAdmin && departments && departments.length > 0 && (
        <div className="mb-8 max-w-sm">
          <label className="block eyebrow mb-2" htmlFor="dept-select">
            {t('positions.pick_department')}
          </label>
          <select
            id="dept-select"
            value={selectedDeptId ?? ''}
            onChange={(e) => setSelectedDeptId(Number(e.target.value))}
            className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading && <p className="eyebrow">{t('common.loading')}</p>}

      {!isLoading && positions && positions.length === 0 && (
        <div className="bg-hp-inset p-7 max-w-xl">
          <h3 className="font-title text-lg text-hp-ink">{t('positions.empty_title')}</h3>
          <p className="mt-2 text-sm text-hp-body">{t('positions.empty_body')}</p>
        </div>
      )}

      {!isLoading && positions && positions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-hp-inset">
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('positions.col_title')}</th>
                {isAdmin && (
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('positions.col_dept')}</th>
                )}
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('positions.col_purpose')}</th>
                <th className="text-center eyebrow py-3 px-4 border-b border-hp-rule w-20">{t('positions.col_kpis')}</th>
                <th className="text-center eyebrow py-3 px-4 border-b border-hp-rule w-20">{t('positions.col_users')}</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="bg-hp-card border-b border-hp-rule hover:bg-hp-inset/40 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/admin/positions/${p.id}`}
                      className="font-body text-hp-ink hover:text-hp-pink transition-colors"
                    >
                      {p.title}
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-sm text-hp-muted">{p.department?.name ?? '—'}</td>
                  )}
                  <td className="py-3 px-4 text-sm text-hp-body truncate max-w-[320px]">
                    {p.rolePurpose || <span className="text-hp-muted">—</span>}
                  </td>
                  <td className="py-3 px-4 text-center text-sm text-hp-body">{p.kpis.length}</td>
                  <td className="py-3 px-4 text-center text-sm text-hp-body">{p._count?.users ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && selectedDeptId && (
        <CreatePositionModal
          departmentId={selectedDeptId}
          onClose={() => setShowCreate(false)}
          onCreated={() => { mutate(); setShowCreate(false); }}
        />
      )}
    </AppShell>
  );
}

function CreatePositionModal({
  departmentId,
  onClose,
  onCreated,
}: {
  departmentId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [rolePurpose, setRolePurpose] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/positions', { departmentId, title: title.trim(), rolePurpose: rolePurpose.trim() || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('positions.save_error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <HpModal open={true} title={t('positions.new')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block eyebrow mb-2">{t('positions.f_title')} *</label>
          <HpInput value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="block eyebrow mb-2">{t('positions.f_role_purpose')}</label>
          <HpInput value={rolePurpose} onChange={(e) => setRolePurpose(e.target.value)} />
        </div>
        {error && <p className="text-xs text-hp-pink">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <HpButton type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</HpButton>
          <HpButton type="submit" disabled={saving}>
            {saving ? t('positions.saving') : t('positions.save')}
          </HpButton>
        </div>
      </form>
    </HpModal>
  );
}
