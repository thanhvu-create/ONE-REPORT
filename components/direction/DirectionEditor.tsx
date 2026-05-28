'use client';

import { FormEvent, useState } from 'react';
import { HpButton } from '@/components/ui/HpButton';
import { useT } from '@/lib/i18n/locale-context';
import {
  DepartmentDirection,
  KeyKpiEntry,
  StrategicFunctionEntry,
  SummaryEntry,
  UpsertDirectionPayload,
} from '@/lib/types';

interface Props {
  initial: DepartmentDirection | null;
  onSave: (payload: UpsertDirectionPayload) => Promise<void>;
  onCancel: () => void;
}

interface Draft {
  overallObjective: string;
  currentStatus: string;
  transformationDirection: string;
  strategicFunctions: StrategicFunctionEntry[];
  shortTerm: string;
  midTerm: string;
  longTerm: string;
  keyKpis: KeyKpiEntry[];
  summaryItems: SummaryEntry[];
}

function toDraft(d: DepartmentDirection | null): Draft {
  return {
    overallObjective: d?.overallObjective ?? '',
    currentStatus: d?.currentStatus ?? '',
    transformationDirection: d?.transformationDirection ?? '',
    strategicFunctions: d?.strategicFunctions ?? [],
    shortTerm: d?.shortTerm ?? '',
    midTerm: d?.midTerm ?? '',
    longTerm: d?.longTerm ?? '',
    keyKpis: d?.keyKpis ?? [],
    summaryItems: d?.summaryItems ?? [],
  };
}

export function DirectionEditor({ initial, onSave, onCancel }: Props) {
  const t = useT();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSave({
        overallObjective: draft.overallObjective.trim() || null,
        currentStatus: draft.currentStatus.trim() || null,
        transformationDirection: draft.transformationDirection.trim() || null,
        strategicFunctions: draft.strategicFunctions
          .map((s) => ({ function: s.function.trim(), keyDirection: s.keyDirection.trim() }))
          .filter((s) => s.function || s.keyDirection),
        shortTerm: draft.shortTerm.trim() || null,
        midTerm: draft.midTerm.trim() || null,
        longTerm: draft.longTerm.trim() || null,
        keyKpis: draft.keyKpis
          .map((k) => ({ kpi: k.kpi.trim(), target: k.target.trim() }))
          .filter((k) => k.kpi || k.target),
        summaryItems: draft.summaryItems
          .map((s) => ({ item: s.item.trim(), details: s.details.trim() }))
          .filter((s) => s.item || s.details),
      });
    } catch (err) {
      setError((err as Error).message || t('direction.save_error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-12 max-w-4xl">
      {/* Section 1 */}
      <section>
        <h3 className="eyebrow mb-4">{t('direction.s1_title')}</h3>
        <div className="space-y-5 bg-hp-card border border-hp-rule p-6">
          <FieldArea
            label={t('direction.f_objective')}
            value={draft.overallObjective}
            onChange={(v) => setDraft({ ...draft, overallObjective: v })}
          />
          <FieldArea
            label={t('direction.f_status')}
            value={draft.currentStatus}
            onChange={(v) => setDraft({ ...draft, currentStatus: v })}
          />
          <FieldArea
            label={t('direction.f_transformation')}
            value={draft.transformationDirection}
            onChange={(v) => setDraft({ ...draft, transformationDirection: v })}
          />
        </div>
      </section>

      {/* Section 2 */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h3 className="eyebrow">{t('direction.s2_title')}</h3>
          <button
            type="button"
            className="eyebrow text-hp-ink hover:text-hp-pink"
            onClick={() =>
              setDraft({
                ...draft,
                strategicFunctions: [...draft.strategicFunctions, { function: '', keyDirection: '' }],
              })
            }
          >
            + {t('direction.add_row')}
          </button>
        </div>
        <div className="space-y-3">
          {draft.strategicFunctions.map((sf, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[260px_1fr_auto] gap-3 items-start bg-hp-card border border-hp-rule p-4">
              <input
                aria-label={t('direction.col_function')}
                placeholder={t('direction.col_function')}
                value={sf.function}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    strategicFunctions: draft.strategicFunctions.map((x, k) => (k === i ? { ...x, function: e.target.value } : x)),
                  })
                }
                className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink"
              />
              <textarea
                aria-label={t('direction.col_key_direction')}
                placeholder={t('direction.col_key_direction')}
                value={sf.keyDirection}
                rows={2}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    strategicFunctions: draft.strategicFunctions.map((x, k) => (k === i ? { ...x, keyDirection: e.target.value } : x)),
                  })
                }
                className="w-full bg-transparent border border-hp-rule p-2 text-hp-body font-body text-sm focus:outline-none focus:border-hp-pink"
              />
              <button
                type="button"
                className="eyebrow text-hp-muted hover:text-hp-pink whitespace-nowrap"
                onClick={() =>
                  setDraft({ ...draft, strategicFunctions: draft.strategicFunctions.filter((_, k) => k !== i) })
                }
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 */}
      <section>
        <h3 className="eyebrow mb-4">{t('direction.s3_title')}</h3>
        <div className="space-y-5 bg-hp-card border border-hp-rule p-6">
          <FieldArea label={t('direction.f_short_term')} value={draft.shortTerm} onChange={(v) => setDraft({ ...draft, shortTerm: v })} />
          <FieldArea label={t('direction.f_mid_term')} value={draft.midTerm} onChange={(v) => setDraft({ ...draft, midTerm: v })} />
          <FieldArea label={t('direction.f_long_term')} value={draft.longTerm} onChange={(v) => setDraft({ ...draft, longTerm: v })} />
        </div>
      </section>

      {/* Section 4 */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h3 className="eyebrow">{t('direction.s4_title')}</h3>
          <button
            type="button"
            className="eyebrow text-hp-ink hover:text-hp-pink"
            onClick={() => setDraft({ ...draft, keyKpis: [...draft.keyKpis, { kpi: '', target: '' }] })}
          >
            + {t('direction.add_row')}
          </button>
        </div>
        <div className="space-y-3">
          {draft.keyKpis.map((k, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-start bg-hp-card border border-hp-rule p-4">
              <input
                aria-label={t('direction.col_kpi')}
                placeholder={t('direction.col_kpi')}
                value={k.kpi}
                onChange={(e) =>
                  setDraft({ ...draft, keyKpis: draft.keyKpis.map((x, j) => (j === i ? { ...x, kpi: e.target.value } : x)) })
                }
                className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink"
              />
              <input
                aria-label={t('direction.col_target')}
                placeholder={t('direction.col_target')}
                value={k.target}
                onChange={(e) =>
                  setDraft({ ...draft, keyKpis: draft.keyKpis.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)) })
                }
                className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink"
              />
              <button
                type="button"
                className="eyebrow text-hp-muted hover:text-hp-pink whitespace-nowrap"
                onClick={() => setDraft({ ...draft, keyKpis: draft.keyKpis.filter((_, j) => j !== i) })}
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h3 className="eyebrow">{t('direction.s5_title')}</h3>
          <button
            type="button"
            className="eyebrow text-hp-ink hover:text-hp-pink"
            onClick={() => setDraft({ ...draft, summaryItems: [...draft.summaryItems, { item: '', details: '' }] })}
          >
            + {t('direction.add_row')}
          </button>
        </div>
        <div className="space-y-3">
          {draft.summaryItems.map((s, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[260px_1fr_auto] gap-3 items-start bg-hp-card border border-hp-rule p-4">
              <input
                aria-label={t('direction.col_item')}
                placeholder={t('direction.col_item')}
                value={s.item}
                onChange={(e) =>
                  setDraft({ ...draft, summaryItems: draft.summaryItems.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)) })
                }
                className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-hp-body font-body focus:outline-none focus:border-hp-pink"
              />
              <textarea
                aria-label={t('direction.col_details')}
                placeholder={t('direction.col_details')}
                value={s.details}
                rows={2}
                onChange={(e) =>
                  setDraft({ ...draft, summaryItems: draft.summaryItems.map((x, j) => (j === i ? { ...x, details: e.target.value } : x)) })
                }
                className="w-full bg-transparent border border-hp-rule p-2 text-hp-body font-body text-sm focus:outline-none focus:border-hp-pink"
              />
              <button
                type="button"
                className="eyebrow text-hp-muted hover:text-hp-pink whitespace-nowrap"
                onClick={() => setDraft({ ...draft, summaryItems: draft.summaryItems.filter((_, j) => j !== i) })}
              >
                {t('common.remove')}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-4 pt-4 border-t border-hp-rule">
        <HpButton type="submit" loading={busy} loadingLabel={t('common.saving')}>
          {t('direction.save')}
        </HpButton>
        <button type="button" onClick={onCancel} className="eyebrow text-hp-muted hover:text-hp-ink">
          {t('common.cancel')}
        </button>
        {error && <span className="text-xs text-hp-pink">{error}</span>}
      </div>
    </form>
  );
}

function FieldArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block eyebrow mb-2">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-transparent border border-hp-rule p-3 text-hp-body font-body text-sm focus:outline-none focus:border-hp-pink"
      />
    </label>
  );
}
