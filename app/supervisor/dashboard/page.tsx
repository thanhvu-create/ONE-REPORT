'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PeriodToggle } from '@/components/dashboard/PeriodToggle';
import { TrendBars } from '@/components/dashboard/TrendBars';
import { PriorityBars } from '@/components/dashboard/PriorityBars';
import { TopContributors } from '@/components/dashboard/TopContributors';
import { DeptHeatmap } from '@/components/dashboard/DeptHeatmap';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { IssueCategoryList } from '@/components/dashboard/IssueCategoryList';
import { DirectionAdjustmentPanel } from '@/components/dashboard/DirectionAdjustmentPanel';
import { TablePanel } from '@/components/ui/TablePanel';
import { swrFetcher } from '@/lib/api';
import {
  DashboardPeriod,
  DashboardSummary,
  DeptHeatmapResponse,
  IssueCategoryDistribution,
  MissingReportEmployee,
  PriorityDistribution,
  RecentActivityResponse,
  TopContributorsResponse,
  TrendResponse,
} from '@/lib/types';

const TREND_DAYS = 14;

export default function SupervisorDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('today');

  const { data: summary } = useSWR<DashboardSummary>(`/dashboard/summary?period=${period}`, swrFetcher);
  const { data: trend } = useSWR<TrendResponse>(`/dashboard/trend?days=${TREND_DAYS}`, swrFetcher);
  const { data: recent } = useSWR<RecentActivityResponse>('/dashboard/recent?limit=10', swrFetcher, { refreshInterval: 30_000 });
  const { data: missing } = useSWR<MissingReportEmployee[]>('/dashboard/missing-reports', swrFetcher);
  const { data: priorityDist } = useSWR<PriorityDistribution>(`/dashboard/priority-distribution?period=${period}`, swrFetcher);
  const { data: topContrib } = useSWR<TopContributorsResponse>(`/dashboard/top-contributors?period=${period}&limit=8`, swrFetcher);
  const { data: heatmap } = useSWR<DeptHeatmapResponse>(`/dashboard/dept-heatmap?period=${period}`, swrFetcher);
  const { data: issueCats } = useSWR<IssueCategoryDistribution>(`/dashboard/issue-categories?period=${period}&limit=8`, swrFetcher);

  const dash = '—';

  return (
    <AppShell requiredRoles={['supervisor']}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8">
        <SectionHeader eyebrow="Ban Giám Sát Nội Bộ" title="Dashboard Toàn Công Ty" />
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4 sm:gap-4">
        <KpiCard label="Tổng báo cáo" value={summary?.total_reports ?? dash} />
        <KpiCard label="Blocker đang mở" value={summary?.total_blockers ?? dash} emphasis="pink" />
        <KpiCard label="Khẩn cấp" value={summary?.urgent_reports ?? dash} emphasis="pink" />
        <KpiCard label="Chưa nộp" value={summary?.missing_report_count ?? dash} />
      </div>

      {/* Trend + Missing */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] mb-6">
        <TrendBars data={trend} />
        <div>
          <h3 className="font-title text-lg text-hp-ink mb-3">Chưa nộp báo cáo</h3>
          {missing?.length === 0 && <p className="text-sm text-hp-muted">Tất cả đã nộp</p>}
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {missing?.map((m) => (
              <li key={m.user_id} className="border border-l-2 border-l-hp-pink border-hp-rule p-3 bg-hp-card">
                <p className="text-sm font-medium">{m.full_name}</p>
                <p className="text-xs text-hp-muted">{m.department_name ?? dash}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-6">
        <PriorityBars data={priorityDist} />
        <TopContributors data={topContrib} />
        <IssueCategoryList data={issueCats} />
      </div>

      {/* Department heatmap */}
      <div className="mb-6">
        <DeptHeatmap data={heatmap} />
      </div>

      {/* Department summary table */}
      <div className="mb-6">
        <h3 className="font-title text-xl text-hp-ink mb-4">Tổng quan phòng ban</h3>
        <TablePanel>
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="bg-hp-inset">
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">Phòng ban</th>
                <th className="text-right eyebrow py-3 px-4 border-b border-hp-rule">Báo cáo</th>
                <th className="text-right eyebrow py-3 px-4 border-b border-hp-rule">Blocker</th>
              </tr>
            </thead>
            <tbody>
              {summary?.departments.map((d) => (
                <tr key={String(d.department_id)} className="bg-hp-card border-b border-hp-rule">
                  <td className="py-3 px-4 text-sm">{d.department_name ?? dash}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-sm">{d.report_count}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-hp-pink text-sm">{d.blocker_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      </div>

      <ActivityFeed data={recent} />

      <div className="mt-6">
        <DirectionAdjustmentPanel />
      </div>
    </AppShell>
  );
}
