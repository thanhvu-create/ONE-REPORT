'use client';

import Link from 'next/link';
import { DepartmentDirection } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

interface Props {
  direction: DepartmentDirection | null | undefined;
  /** Number of KPIs to show inline. */
  maxKpis?: number;
}

export function DirectionSnippet({ direction, maxKpis = 3 }: Props) {
  const t = useT();
  if (!direction) return null;

  const objective = direction.overallObjective?.trim();
  const transformation = direction.transformationDirection?.trim();
  const kpis = direction.keyKpis?.slice(0, maxKpis) ?? [];
  const deptName = direction.department?.name ?? '';

  return (
    <section
      className="bg-hp-inset/60 border-l-4 border-hp-pink p-5 sm:p-6 mb-6 sm:mb-8"
      aria-labelledby="direction-snippet-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <span className="eyebrow text-hp-pink">{t('dashboard.direction_eyebrow')}{deptName && ` · ${deptName}`}</span>
          <h2
            id="direction-snippet-title"
            className="font-title text-xl text-hp-ink leading-tight mt-1 sm:text-2xl break-words"
          >
            {objective || t('dashboard.direction_no_objective')}
          </h2>
          {transformation && (
            <p className="text-sm text-hp-body leading-relaxed mt-2 break-words max-w-2xl">{transformation}</p>
          )}
        </div>
        <Link
          href="/direction"
          className="eyebrow text-hp-ink hover:text-hp-pink whitespace-nowrap shrink-0"
        >
          {t('dashboard.direction_view_full')} →
        </Link>
      </div>

      {kpis.length > 0 && (
        <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((k, i) => (
            <div key={i} className="bg-hp-card border border-hp-rule p-3">
              <dt className="eyebrow text-[10px] text-hp-muted truncate">{k.kpi}</dt>
              <dd className="text-hp-ink font-body text-sm break-words mt-0.5">{k.target}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
