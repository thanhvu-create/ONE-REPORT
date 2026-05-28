'use client';

import { TrendResponse } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

interface Props {
  data: TrendResponse | undefined;
}

const BAR_W = 16;
const GAP = 6;
const HEIGHT = 130;
const PAD_BOTTOM = 22;

export function TrendBars({ data }: Props) {
  const t = useT();
  const buckets = data?.buckets ?? [];
  const max = Math.max(1, ...buckets.map((b) => b.reports));
  const totalReports = buckets.reduce((s, b) => s + b.reports, 0);

  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div>
          <h3 className="font-title text-xl text-hp-ink leading-tight">{t('dashboard.trend_title')}</h3>
          <p className="eyebrow mt-1">{t('dashboard.trend_helper', { days: data?.days ?? 14 })}</p>
        </div>
        <span className="font-title text-2xl text-hp-ink tabular-nums">{totalReports}</span>
      </div>

      {totalReports === 0 && (
        <p className="text-sm text-hp-muted py-6">{t('dashboard.trend_no_data')}</p>
      )}

      {totalReports > 0 && (
        <div className="overflow-x-auto">
          <svg
            role="img"
            aria-label={t('dashboard.trend_title')}
            width={buckets.length * (BAR_W + GAP)}
            height={HEIGHT + PAD_BOTTOM}
            className="block min-w-full"
          >
            {/* baseline */}
            <line
              x1={0}
              y1={HEIGHT}
              x2={buckets.length * (BAR_W + GAP)}
              y2={HEIGHT}
              stroke="var(--rule)"
              strokeWidth={1}
            />
            {buckets.map((b, i) => {
              const h = (b.reports / max) * (HEIGHT - 8);
              const x = i * (BAR_W + GAP);
              const y = HEIGHT - h;
              const blockerH = (b.blockers / max) * (HEIGHT - 8);
              const showLabel = i === 0 || i === buckets.length - 1 || i === Math.floor(buckets.length / 2);
              return (
                <g key={b.date}>
                  <title>{`${b.date}: ${b.reports} reports, ${b.blockers} blocker(s)`}</title>
                  {b.reports > 0 && (
                    <rect
                      x={x}
                      y={y}
                      width={BAR_W}
                      height={h}
                      fill="var(--ink-primary)"
                      opacity={0.85}
                    />
                  )}
                  {b.blockers > 0 && (
                    <rect
                      x={x}
                      y={HEIGHT - blockerH}
                      width={BAR_W}
                      height={blockerH}
                      fill="var(--accent)"
                      opacity={0.9}
                    />
                  )}
                  {showLabel && (
                    <text
                      x={x + BAR_W / 2}
                      y={HEIGHT + 14}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--ink-muted)"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}
                    >
                      {b.date.slice(5)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {totalReports > 0 && (
        <div className="flex items-center gap-4 mt-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-hp-muted">
            <span className="inline-block w-3 h-3" style={{ background: 'var(--ink-primary)', opacity: 0.85 }} />
            {t('dashboard.kpi_reports')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-hp-muted">
            <span className="inline-block w-3 h-3" style={{ background: 'var(--accent)' }} />
            {t('dashboard.kpi_blockers')}
          </span>
        </div>
      )}
    </div>
  );
}
