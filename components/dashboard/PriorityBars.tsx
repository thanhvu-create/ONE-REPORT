'use client';

import { Priority, PriorityDistribution } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

const TONE: Record<Priority, string> = {
  low: 'bg-hp-muted/40',
  medium: 'bg-hp-body/50',
  high: 'bg-hp-ink/80',
  urgent: 'bg-hp-pink',
};

export function PriorityBars({ data }: { data: PriorityDistribution | undefined }) {
  const t = useT();
  const total = data?.total ?? 0;
  const buckets = data?.buckets ?? [];
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <h3 className="font-title text-xl text-hp-ink leading-tight">{t('dashboard.priority_title')}</h3>
        <span className="font-title text-2xl text-hp-ink tabular-nums">{total}</span>
      </div>

      {total === 0 && <p className="text-sm text-hp-muted py-6">{t('dashboard.priority_no_data')}</p>}

      {total > 0 && (
        <ul className="space-y-3">
          {buckets.map((b) => {
            const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
            const width = (b.count / max) * 100;
            return (
              <li key={b.priority}>
                <div className="flex items-baseline justify-between mb-1 gap-3">
                  <span className="eyebrow">{t(`priority.${b.priority}`)}</span>
                  <span className="text-xs text-hp-muted tabular-nums">
                    <span className="text-hp-ink mr-1">{b.count}</span>· {pct}%
                  </span>
                </div>
                <div className="h-2 bg-hp-inset overflow-hidden">
                  <div
                    className={`h-full ${TONE[b.priority]}`}
                    style={{ width: `${width}%` }}
                    role="progressbar"
                    aria-valuenow={b.count}
                    aria-valuemin={0}
                    aria-valuemax={max}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
