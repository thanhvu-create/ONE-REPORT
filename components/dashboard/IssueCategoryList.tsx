'use client';

import { IssueCategoryDistribution } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

export function IssueCategoryList({ data }: { data: IssueCategoryDistribution | undefined }) {
  const t = useT();
  const total = data?.total_with_issues ?? 0;
  const buckets = data?.buckets ?? [];
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <h3 className="font-title text-xl text-hp-ink leading-tight">{t('dashboard.issues_title')}</h3>
        <span className="font-title text-2xl text-hp-pink tabular-nums">{total}</span>
      </div>

      {total === 0 && <p className="text-sm text-hp-muted py-6">{t('dashboard.issues_no_data')}</p>}

      {total > 0 && (
        <ul className="space-y-3">
          {buckets.map((b) => {
            const width = (b.count / max) * 100;
            return (
              <li key={b.category}>
                <div className="flex items-baseline justify-between mb-1 gap-3">
                  <span className="text-sm text-hp-body break-words">{t(`category.${b.category}`)}</span>
                  <span className="text-xs text-hp-ink tabular-nums">{b.count}</span>
                </div>
                <div className="h-2 bg-hp-inset overflow-hidden">
                  <div className="h-full bg-hp-pink/80" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
