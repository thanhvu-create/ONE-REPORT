'use client';

import { RecentActivityResponse } from '@/lib/types';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { relativeTime } from '@/lib/relative-time';
import { useT } from '@/lib/i18n/locale-context';

export function ActivityFeed({ data }: { data: RecentActivityResponse | undefined }) {
  const t = useT();
  const items = data?.items ?? [];

  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-6">
      <h3 className="font-title text-xl text-hp-ink leading-tight mb-5">{t('dashboard.activity_title')}</h3>

      {items.length === 0 && (
        <p className="text-sm text-hp-muted py-6">{t('dashboard.activity_no_data')}</p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-hp-rule">
          {items.map((it) => (
            <li key={it.id} className="py-3 first:pt-0 last:pb-0 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 sm:w-auto">
                <PriorityBadge value={it.ai_priority} />
                <span className="eyebrow text-[10px] text-hp-muted">{t(`source.${it.source_type}`)}</span>
                {it.has_blocker && (
                  <span className="eyebrow text-[10px] text-hp-pink">· {t('dashboard.activity_blocker')}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-hp-ink truncate">
                  <span className="font-body">{it.employee_name}</span>
                  <span className="text-hp-muted"> · {it.department_name ?? t('common.dash')}</span>
                </p>
                {it.original_excerpt && (
                  <p className="text-xs text-hp-muted truncate">{it.original_excerpt}</p>
                )}
              </div>
              <span className="text-[11px] text-hp-muted tabular-nums whitespace-nowrap">
                {relativeTime(t, it.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
