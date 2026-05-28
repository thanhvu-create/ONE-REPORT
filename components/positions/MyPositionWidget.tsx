'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { AuthenticatedUser, Position } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

export function MyPositionWidget({ user }: { user: AuthenticatedUser }) {
  const t = useT();
  const { data: positions, isLoading } = useSWR<Position[]>(
    user.departmentId ? `/positions?departmentId=${user.departmentId}` : null,
    swrFetcher,
  );

  const myPosition = positions?.find((p) => p.id === user.positionId) ?? null;

  if (isLoading) return null;

  return (
    <div className="bg-hp-card border border-hp-rule p-5">
      <p className="eyebrow text-xs text-hp-muted mb-3">{t('positions.my_position')}</p>

      {!myPosition ? (
        <p className="text-sm text-hp-muted">{t('positions.my_position_none')}</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="font-title text-lg text-hp-ink">{myPosition.title}</p>
            {myPosition.rolePurpose && (
              <p className="text-sm text-hp-body mt-0.5">{myPosition.rolePurpose}</p>
            )}
          </div>

          {myPosition.kpis.length > 0 && (
            <ul className="space-y-1 border-t border-hp-rule pt-3">
              {myPosition.kpis.slice(0, 4).map((kpi) => (
                <li key={kpi.id} className="flex items-start gap-2 text-sm">
                  <span className="text-hp-muted shrink-0">·</span>
                  <span className="text-hp-body">
                    <span className="text-hp-ink">{kpi.kpiName}</span>
                    {kpi.target && <span className="text-hp-muted"> — {kpi.target}</span>}
                  </span>
                </li>
              ))}
              {myPosition.kpis.length > 4 && (
                <li className="text-xs text-hp-muted pl-4">+{myPosition.kpis.length - 4} KPI khác</li>
              )}
            </ul>
          )}

          <Link
            href={`/admin/positions/${myPosition.id}`}
            className="inline-block eyebrow text-xs text-hp-pink hover:text-hp-ink transition-colors mt-1"
          >
            {t('positions.my_position_link')} →
          </Link>
        </div>
      )}
    </div>
  );
}
