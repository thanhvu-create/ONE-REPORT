'use client';

import { DepartmentDirection } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

export function DirectionView({ direction }: { direction: DepartmentDirection | null }) {
  const t = useT();

  if (!direction) {
    return (
      <div className="bg-hp-inset p-7 max-w-xl">
        <h3 className="font-title text-lg text-hp-ink">{t('direction.empty_title')}</h3>
        <p className="mt-2 text-sm text-hp-body">{t('direction.empty_body')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-4xl">
      {/* 1. Overall direction */}
      <section>
        <h3 className="eyebrow mb-4">{t('direction.s1_title')}</h3>
        <dl className="bg-hp-card border border-hp-rule divide-y divide-hp-rule">
          <Row label={t('direction.f_objective')} value={direction.overallObjective} />
          <Row label={t('direction.f_status')} value={direction.currentStatus} />
          <Row label={t('direction.f_transformation')} value={direction.transformationDirection} />
        </dl>
      </section>

      {/* 2. Strategic functions */}
      <section>
        <h3 className="eyebrow mb-4">{t('direction.s2_title')}</h3>
        {direction.strategicFunctions.length === 0 ? (
          <p className="text-sm text-hp-muted">{t('direction.empty_section')}</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-hp-inset">
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule w-1/3">{t('direction.col_function')}</th>
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('direction.col_key_direction')}</th>
              </tr>
            </thead>
            <tbody>
              {direction.strategicFunctions.map((sf, i) => (
                <tr key={i} className="bg-hp-card border-b border-hp-rule">
                  <td className="py-3 px-4 text-hp-ink font-body">{sf.function}</td>
                  <td className="py-3 px-4 text-hp-body whitespace-pre-wrap">{sf.keyDirection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 3. Timeline */}
      <section>
        <h3 className="eyebrow mb-4">{t('direction.s3_title')}</h3>
        <dl className="bg-hp-card border border-hp-rule divide-y divide-hp-rule">
          <Row label={t('direction.f_short_term')} value={direction.shortTerm} />
          <Row label={t('direction.f_mid_term')} value={direction.midTerm} />
          <Row label={t('direction.f_long_term')} value={direction.longTerm} />
        </dl>
      </section>

      {/* 4. Key KPIs */}
      <section>
        <h3 className="eyebrow mb-4">{t('direction.s4_title')}</h3>
        {direction.keyKpis.length === 0 ? (
          <p className="text-sm text-hp-muted">{t('direction.empty_section')}</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-hp-inset">
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule w-2/3">{t('direction.col_kpi')}</th>
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('direction.col_target')}</th>
              </tr>
            </thead>
            <tbody>
              {direction.keyKpis.map((k, i) => (
                <tr key={i} className="bg-hp-card border-b border-hp-rule">
                  <td className="py-3 px-4 text-hp-ink font-body">{k.kpi}</td>
                  <td className="py-3 px-4 text-hp-body whitespace-pre-wrap">{k.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 5. Summary */}
      <section>
        <h3 className="eyebrow mb-4">{t('direction.s5_title')}</h3>
        {direction.summaryItems.length === 0 ? (
          <p className="text-sm text-hp-muted">{t('direction.empty_section')}</p>
        ) : (
          <dl className="bg-hp-card border border-hp-rule divide-y divide-hp-rule">
            {direction.summaryItems.map((s, i) => (
              <Row key={i} label={s.item} value={s.details} />
            ))}
          </dl>
        )}
      </section>

      <p className="text-xs text-hp-muted">
        {t('direction.last_updated')}: {new Date(direction.updatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-6 px-5 py-4">
      <dt className="eyebrow text-hp-muted">{label}</dt>
      <dd className="text-hp-body whitespace-pre-wrap">{value || <span className="text-hp-muted">—</span>}</dd>
    </div>
  );
}
