'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HpButton } from '@/components/ui/HpButton';
import { DirectionView } from '@/components/direction/DirectionView';
import { DirectionEditor } from '@/components/direction/DirectionEditor';
import { api, ApiError, swrFetcher } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import {
  AuthenticatedUser,
  Department,
  DepartmentDirection,
  UpsertDirectionPayload,
} from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

export default function DirectionPage() {
  const t = useT();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const canBrowseAllDepts = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'executive';
  const { data: departments } = useSWR<Department[]>(canBrowseAllDepts ? '/departments' : null, swrFetcher);

  // Default department selection by role
  useEffect(() => {
    if (!user || selectedDeptId !== null) return;
    if (canBrowseAllDepts) {
      if (departments && departments.length > 0) setSelectedDeptId(departments[0].id);
    } else if (user.departmentId) {
      setSelectedDeptId(user.departmentId);
    }
  }, [user, departments, selectedDeptId, canBrowseAllDepts]);

  const directionKey = selectedDeptId ? `/department-directions/${selectedDeptId}` : null;
  const { data: direction, mutate, isLoading } = useSWR<DepartmentDirection | null>(directionKey, swrFetcher);

  const canEdit = useMemo(() => {
    if (!user || !selectedDeptId) return false;
    if (user.role === 'admin') return true;
    return user.role === 'leader' && user.departmentId === selectedDeptId;
  }, [user, selectedDeptId]);

  async function save(payload: UpsertDirectionPayload) {
    if (!selectedDeptId) return;
    setError(null);
    try {
      await api.put<DepartmentDirection>(`/department-directions/${selectedDeptId}`, payload);
      await mutate();
      setEditing(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('direction.save_error');
      setError(msg);
      throw err;
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end gap-6 justify-between mb-2">
        <SectionHeader
          eyebrow={t('direction.eyebrow')}
          title={t('direction.title')}
          description={t('direction.description')}
        />
        {!editing && canEdit && direction !== undefined && (
          <HpButton type="button" variant="secondary" onClick={() => setEditing(true)}>
            {direction ? t('direction.edit') : t('direction.create')}
          </HpButton>
        )}
      </div>

      {/* Department selector for admin / supervisor / executive */}
      {canBrowseAllDepts && departments && departments.length > 0 && (
        <div className="mb-8 max-w-sm">
          <label className="block eyebrow mb-2" htmlFor="dept-select">
            {t('direction.pick_department')}
          </label>
          <select
            id="dept-select"
            value={selectedDeptId ?? ''}
            onChange={(e) => {
              setSelectedDeptId(Number(e.target.value));
              setEditing(false);
            }}
            className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-xs text-hp-pink mb-4">{error}</p>}

      {isLoading && <p className="eyebrow">{t('common.loading')}</p>}

      {!isLoading && !editing && (
        <DirectionView direction={direction ?? null} />
      )}

      {editing && (
        <DirectionEditor
          initial={direction ?? null}
          onSave={save}
          onCancel={() => setEditing(false)}
        />
      )}
    </AppShell>
  );
}
