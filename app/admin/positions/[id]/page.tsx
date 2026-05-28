'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HpButton } from '@/components/ui/HpButton';
import { HpInput } from '@/components/ui/HpInput';
import { api, ApiError, swrFetcher } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { AuthenticatedUser, KpiCycle, Position, PositionKpi } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

type Tab = 'detail' | 'kpis';

export default function PositionDetailPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [tab, setTab] = useState<Tab>('detail');
  const [editing, setEditing] = useState(false);

  useEffect(() => { setUser(getStoredUser()); }, []);

  const { data: position, mutate, isLoading } = useSWR<Position>(
    id ? `/positions/${id}` : null,
    swrFetcher,
  );

  const canEdit = user?.role === 'admin' ||
    (user?.role === 'leader' && user.departmentId === position?.departmentId);

  async function deletePosition() {
    if (!confirm(t('positions.delete_confirm'))) return;
    await api.delete(`/positions/${id}`);
    router.replace('/admin/positions');
  }

  if (isLoading || !position) {
    return (
      <AppShell>
        <p className="eyebrow">{t('common.loading')}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="eyebrow text-hp-muted hover:text-hp-ink transition-colors text-sm"
        >
          ← {t('positions.back')}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-6 justify-between mb-2">
        <SectionHeader
          eyebrow={position.department?.name ?? t('positions.eyebrow')}
          title={position.title}
          description={position.rolePurpose ?? undefined}
        />
        {canEdit && !editing && (
          <div className="flex gap-2">
            <HpButton type="button" variant="secondary" onClick={() => setEditing(true)}>
              {t('positions.edit')}
            </HpButton>
            <HpButton type="button" variant="ghost" onClick={deletePosition}>
              {t('positions.delete')}
            </HpButton>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-hp-rule mb-8">
        {(['detail', 'kpis'] as Tab[]).map((t_) => (
          <button
            key={t_}
            type="button"
            onClick={() => { setTab(t_); setEditing(false); }}
            className={`px-5 py-3 text-sm font-body border-b-2 transition-colors ${
              tab === t_
                ? 'border-hp-pink text-hp-ink'
                : 'border-transparent text-hp-muted hover:text-hp-ink'
            }`}
          >
            {t_ === 'detail' ? t('positions.tab_detail') : t('positions.tab_kpis')}
          </button>
        ))}
      </div>

      {tab === 'detail' && !editing && (
        <PositionDetailView position={position} />
      )}

      {tab === 'detail' && editing && (
        <PositionEditForm
          position={position}
          onSaved={() => { mutate(); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}

      {tab === 'kpis' && (
        <KpiPanel position={position} canEdit={canEdit} onMutate={mutate} />
      )}
    </AppShell>
  );
}

function PositionDetailView({ position }: { position: Position }) {
  const t = useT();
  return (
    <div className="space-y-10 max-w-3xl">
      <Section title={t('positions.f_role_purpose')}>
        <p className="text-hp-body whitespace-pre-wrap">{position.rolePurpose || <span className="text-hp-muted">—</span>}</p>
      </Section>

      <StringListSection title={t('positions.f_workstreams')} items={position.workstreams} />
      <StringListSection title={t('positions.f_responsibilities')} items={position.responsibilities} />
      <StringListSection title={t('positions.f_expected_outputs')} items={position.expectedOutputs} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  );
}

function StringListSection({ title, items }: { title: string; items: string[] }) {
  const t = useT();
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-hp-muted">{t('positions.empty_section')}</p>
      ) : (
        <ul className="space-y-1 list-disc list-inside">
          {items.map((item, i) => (
            <li key={i} className="text-hp-body text-sm">{item}</li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function PositionEditForm({
  position,
  onSaved,
  onCancel,
}: {
  position: Position;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(position.title);
  const [rolePurpose, setRolePurpose] = useState(position.rolePurpose ?? '');
  const [workstreams, setWorkstreams] = useState<string[]>(position.workstreams);
  const [responsibilities, setResponsibilities] = useState<string[]>(position.responsibilities);
  const [expectedOutputs, setExpectedOutputs] = useState<string[]>(position.expectedOutputs);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`/positions/${position.id}`, {
        title: title.trim(),
        rolePurpose: rolePurpose.trim() || null,
        workstreams: workstreams.filter(Boolean),
        responsibilities: responsibilities.filter(Boolean),
        expectedOutputs: expectedOutputs.filter(Boolean),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('positions.save_error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      <div>
        <label className="block eyebrow mb-2">{t('positions.f_title')} *</label>
        <HpInput value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="block eyebrow mb-2">{t('positions.f_role_purpose')}</label>
        <textarea
          value={rolePurpose}
          onChange={(e) => setRolePurpose(e.target.value)}
          rows={3}
          className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink resize-none"
        />
      </div>

      <StringListEditor label={t('positions.f_workstreams')} items={workstreams} onChange={setWorkstreams} />
      <StringListEditor label={t('positions.f_responsibilities')} items={responsibilities} onChange={setResponsibilities} />
      <StringListEditor label={t('positions.f_expected_outputs')} items={expectedOutputs} onChange={setExpectedOutputs} />

      {error && <p className="text-xs text-hp-pink">{error}</p>}
      <div className="flex gap-3">
        <HpButton type="submit" disabled={saving}>
          {saving ? t('positions.saving') : t('positions.save')}
        </HpButton>
        <HpButton type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</HpButton>
      </div>
    </form>
  );
}

function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  const t = useT();
  function update(i: number, val: string) {
    const next = [...items];
    next[i] = val;
    onChange(next);
  }
  function remove(i: number) { onChange(items.filter((_, idx) => idx !== i)); }
  function add() { onChange([...items, '']); }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="eyebrow">{label}</h4>
        <button type="button" onClick={add} className="text-xs text-hp-pink hover:text-hp-ink transition-colors eyebrow">
          + {t('positions.add_item')}
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <HpInput
              value={item}
              onChange={(e) => update(i, e.target.value)}
              className="flex-1"
            />
            <button type="button" onClick={() => remove(i)} className="text-hp-muted hover:text-hp-pink eyebrow text-xs transition-colors px-1">
              {t('common.remove')}
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-hp-muted">{t('positions.empty_section')}</p>
        )}
      </div>
    </div>
  );
}

function KpiPanel({
  position,
  canEdit,
  onMutate,
}: {
  position: Position;
  canEdit: boolean;
  onMutate: () => void;
}) {
  const t = useT();
  const [showAdd, setShowAdd] = useState(false);
  const [editingKpi, setEditingKpi] = useState<PositionKpi | null>(null);

  async function deleteKpi(kpiId: number) {
    await api.delete(`/positions/${position.id}/kpis/${kpiId}`);
    onMutate();
  }

  return (
    <div className="max-w-3xl">
      {canEdit && (
        <div className="mb-6">
          <HpButton type="button" variant="secondary" onClick={() => { setShowAdd(true); setEditingKpi(null); }}>
            {t('positions.kpi_add')}
          </HpButton>
        </div>
      )}

      {(showAdd || editingKpi) && (
        <div className="mb-8 p-5 bg-hp-inset border border-hp-rule">
          <KpiForm
            positionId={position.id}
            initial={editingKpi ?? undefined}
            onSaved={() => { setShowAdd(false); setEditingKpi(null); onMutate(); }}
            onCancel={() => { setShowAdd(false); setEditingKpi(null); }}
          />
        </div>
      )}

      {position.kpis.length === 0 ? (
        <p className="text-sm text-hp-muted">{t('positions.kpi_empty')}</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-hp-inset">
              <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('positions.kpi_name')}</th>
              <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('positions.kpi_target')}</th>
              <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule w-32">{t('positions.kpi_cycle')}</th>
              <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('positions.kpi_notes')}</th>
              {canEdit && <th className="eyebrow py-3 px-4 border-b border-hp-rule w-24" />}
            </tr>
          </thead>
          <tbody>
            {position.kpis.map((kpi) => (
              <tr key={kpi.id} className="bg-hp-card border-b border-hp-rule">
                <td className="py-3 px-4 font-body text-hp-ink">{kpi.kpiName}</td>
                <td className="py-3 px-4 text-sm text-hp-body">{kpi.target ?? <span className="text-hp-muted">—</span>}</td>
                <td className="py-3 px-4 text-sm text-hp-body">
                  {kpi.cycle === 'monthly' ? t('positions.cycle_monthly') : t('positions.cycle_quarterly')}
                </td>
                <td className="py-3 px-4 text-sm text-hp-body">{kpi.notes ?? <span className="text-hp-muted">—</span>}</td>
                {canEdit && (
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingKpi(kpi); setShowAdd(false); }}
                        className="eyebrow text-xs text-hp-muted hover:text-hp-ink transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteKpi(kpi.id)}
                        className="eyebrow text-xs text-hp-muted hover:text-hp-pink transition-colors"
                      >
                        {t('positions.kpi_delete')}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function KpiForm({
  positionId,
  initial,
  onSaved,
  onCancel,
}: {
  positionId: number;
  initial?: PositionKpi;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [kpiName, setKpiName] = useState(initial?.kpiName ?? '');
  const [target, setTarget] = useState(initial?.target ?? '');
  const [cycle, setCycle] = useState<KpiCycle>(initial?.cycle ?? 'monthly');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kpiName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { kpiName: kpiName.trim(), target: target.trim() || undefined, cycle, notes: notes.trim() || undefined };
      if (initial) {
        await api.put(`/positions/${positionId}/kpis/${initial.id}`, payload);
      } else {
        await api.post(`/positions/${positionId}/kpis`, payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('positions.save_error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block eyebrow mb-2">{t('positions.kpi_name')} *</label>
          <HpInput value={kpiName} onChange={(e) => setKpiName(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="block eyebrow mb-2">{t('positions.kpi_target')}</label>
          <HpInput value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div>
          <label className="block eyebrow mb-2">{t('positions.kpi_cycle')}</label>
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value as KpiCycle)}
            className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink"
          >
            <option value="monthly">{t('positions.cycle_monthly')}</option>
            <option value="quarterly">{t('positions.cycle_quarterly')}</option>
          </select>
        </div>
        <div>
          <label className="block eyebrow mb-2">{t('positions.kpi_notes')}</label>
          <HpInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-xs text-hp-pink">{error}</p>}
      <div className="flex gap-2">
        <HpButton type="submit" disabled={saving}>
          {saving ? t('positions.saving') : t('positions.kpi_save')}
        </HpButton>
        <HpButton type="button" variant="ghost" onClick={onCancel}>{t('positions.kpi_cancel')}</HpButton>
      </div>
    </form>
  );
}
