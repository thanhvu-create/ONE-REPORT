'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PeriodToggle } from '@/components/dashboard/PeriodToggle';
import { TrendBars } from '@/components/dashboard/TrendBars';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { DataCard, MetaRow } from '@/components/ui/DataCard';
import { TablePanel } from '@/components/ui/TablePanel';
import { MyPositionWidget } from '@/components/positions/MyPositionWidget';
import { MyTasksWidget } from '@/components/tasks/MyTasksWidget';
import { DirectionAdjustmentPanel } from '@/components/dashboard/DirectionAdjustmentPanel';
import { swrFetcher } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import {
  AuthenticatedUser,
  DashboardPeriod,
  DashboardSummary,
  DepartmentDirection,
  MissingReportEmployee,
  RecentActivityResponse,
  TrendResponse,
} from '@/lib/types';

const TREND_DAYS = 14;

export default function LeaderDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => { setUser(getStoredUser()); }, []);

  const { data: summary } = useSWR<DashboardSummary>(`/dashboard/summary?period=${period}`, swrFetcher);
  const { data: trend } = useSWR<TrendResponse>(`/dashboard/trend?days=${TREND_DAYS}`, swrFetcher);
  const { data: recent } = useSWR<RecentActivityResponse>('/dashboard/recent?limit=8', swrFetcher, { refreshInterval: 30_000 });
  const { data: missing } = useSWR<MissingReportEmployee[]>('/dashboard/missing-reports', swrFetcher);
  const directionKey = user?.departmentId ? `/department-directions/${user.departmentId}` : null;
  const { data: direction } = useSWR<DepartmentDirection | null>(directionKey, swrFetcher);

  const dash = '—';

  return (
    <AppShell requiredRoles={['leader']}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8">
        <SectionHeader
          eyebrow="Dashboard Trưởng Phòng"
          title={user?.departmentId ? 'Tổng quan phòng ban' : 'Dashboard'}
        />
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {direction?.overallObjective && (
        <div className="mb-6 p-4 border-l-2 border-hp-pink bg-hp-inset">
          <p className="eyebrow text-xs text-hp-muted mb-1">Định hướng phòng ban</p>
          <p className="text-sm">{direction.overallObjective}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4 sm:gap-4">
        <KpiCard label="Báo cáo" value={summary?.total_reports ?? dash} />
        <KpiCard label="Blocker" value={summary?.total_blockers ?? dash} emphasis="pink" />
        <KpiCard label="Khẩn cấp" value={summary?.urgent_reports ?? dash} emphasis="pink" />
        <KpiCard label="Chưa nộp" value={summary?.missing_report_count ?? dash} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <TrendBars data={trend} />
        <div>
          <h3 className="font-title text-xl text-hp-ink mb-4">Chưa nộp báo cáo hôm nay</h3>
          {missing?.length === 0 && <p className="text-sm text-hp-muted">Tất cả đã nộp báo cáo</p>}
          <ul className="space-y-2">
            {missing?.map((m) => (
              <li key={m.user_id} className="bg-hp-card border border-l-2 border-l-hp-pink border-hp-rule p-4">
                <p className="font-body text-hp-ink">{m.full_name}</p>
                <p className="text-xs text-hp-muted mt-0.5">{m.email}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <ActivityFeed data={recent} />
        <div className="flex flex-col gap-4">
          {user && <MyPositionWidget user={user} />}
          <MyTasksWidget />
        </div>
      </div>

      <DirectionAdjustmentPanel />
    </AppShell>
  );
}
