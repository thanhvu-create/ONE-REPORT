'use client';

import { TopContributorsResponse } from '@/lib/types';
import { UserAvatar } from '@/components/admin/UserAvatar';
import { useT } from '@/lib/i18n/locale-context';

export function TopContributors({ data }: { data: TopContributorsResponse | undefined }) {
  const t = useT();
  const list = data?.contributors ?? [];

  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="font-title text-xl text-hp-ink leading-tight">{t('dashboard.top_contributors_title')}</h3>
        <p className="eyebrow mt-1">{t('dashboard.top_contributors_helper')}</p>
      </div>

      {list.length === 0 && (
        <p className="text-sm text-hp-muted py-6">{t('dashboard.top_contributors_no_data')}</p>
      )}

      {list.length > 0 && (
        <ol className="space-y-3">
          {list.map((c, i) => (
            <li key={c.user_id} className="flex items-center gap-3">
              <span className="font-title text-lg text-hp-muted tabular-nums w-6 text-right">{i + 1}</span>
              <UserAvatar name={c.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-hp-ink truncate font-body">{c.full_name}</p>
                <p className="text-[11px] text-hp-muted truncate">
                  {c.department_name ?? t('common.dash')}
                </p>
              </div>
              <span className="font-title text-xl text-hp-ink tabular-nums">{c.report_count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
