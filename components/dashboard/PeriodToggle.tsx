'use client';

import { DashboardPeriod } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

interface Props {
  value: DashboardPeriod;
  onChange: (v: DashboardPeriod) => void;
}

const ORDER: DashboardPeriod[] = ['today', 'week', 'month'];

export function PeriodToggle({ value, onChange }: Props) {
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t('dashboard.eyebrow')}
      className="inline-flex bg-hp-card border border-hp-rule"
    >
      {ORDER.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={active}
            className={`uppercase tracking-eyebrow text-[10px] px-3.5 py-2 transition-colors duration-150 ${
              active
                ? 'bg-hp-ink text-hp-foundation'
                : 'text-hp-muted hover:text-hp-ink'
            }`}
          >
            {t(`dashboard.period_${p}`)}
          </button>
        );
      })}
    </div>
  );
}
