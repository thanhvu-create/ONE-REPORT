'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { PeriodToggle } from '@/components/dashboard/PeriodToggle';
import { TrendBars } from '@/components/dashboard/TrendBars';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { PriorityBars } from '@/components/dashboard/PriorityBars';
import { TopContributors } from '@/components/dashboard/TopContributors';
import { TablePanel } from '@/components/ui/TablePanel';
import { swrFetcher } from '@/lib/api';
import {
  DashboardPeriod,
  DashboardSummary,
  MissingReportEmployee,
  PriorityDistribution,
  RecentActivityResponse,
  TopContributorsResponse,
  TrendResponse,
} from '@/lib/types';

const TREND_DAYS = 30;

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('week');

  const { data: summary } = useSWR<DashboardSummary>(`/dashboard/summary?period=${period}`, swrFetcher);
  const { data: trend } = useSWR<TrendResponse>(`/dashboard/trend?days=${TREND_DAYS}`, swrFetcher);
  const { data: recent } = useSWR<RecentActivityResponse>('/dashboard/recent?limit=10', swrFetcher, { refreshInterval: 60_000 });
  const { data: missing } = useSWR<MissingReportEmployee[]>('/dashboard/missing-reports', swrFetcher);
  const { data: priorityDist } = useSWR<PriorityDistribution>(`/dashboard/priority-distribution?period=${period}`, swrFetcher);
  const { data: topContrib } = useSWR<TopContributorsResponse>(`/dashboard/top-contributors?period=${period}&limit=5`, swrFetcher);

  const dash = '—';

  return (
    <AppShell requiredRoles={['executive']}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <SectionHeader eyebrow="Ban Lãnh Đạo" title="Tổng quan hoạt động nội bộ" />
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4 sm:gap-6">
        <KpiCard label="Tổng báo cáo" value={summary?.total_reports ?? dash} />
        <KpiCard label="Blocker cần xử lý" value={summary?.total_blockers ?? dash} emphasis="pink" />
        <KpiCard label="Khẩn cấp" value={summary?.urgent_reports ?? dash} emphasis="pink" />
        <KpiCard label="Chưa nộp báo cáo" value={summary?.missing_report_count ?? dash} />
      </div>

      {/* Trend */}
      <div className="mb-8">
        <TrendBars data={trend} />
      </div>

      {/* Department breakdown */}
      <div className="mb-8">
        <h2 className="font-title text-2xl text-hp-ink mb-4">Theo phòng ban</h2>
        <TablePanel>
          <table className="w-full min-w-[400px] border-collapse">
            <thead>
              <tr className="bg-hp-inset">
                <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">Phòng ban</th>
                <th className="text-right eyebrow py-3 px-4 border-b border-hp-rule">Báo cáo</th>
                <th className="text-right eyebrow py-3 px-4 border-b border-hp-rule">Blocker</th>
              </tr>
            </thead>
            <tbody>
              {summary?.departments.length === 0 && (
                <tr><td colSpan={3} className="py-6 px-4 text-sm text-hp-muted">Chưa có dữ liệu</td></tr>
              )}
              {summary?.departments.map((d) => (
                <tr key={String(d.department_id)} className="bg-hp-card border-b border-hp-rule">
                  <td className="py-3 px-4">{d.department_name ?? dash}</td>
                  <td className="py-3 px-4 text-right tabular-nums">{d.report_count}</td>
                  <td className={`py-3 px-4 text-right tabular-nums ${d.blocker_count > 0 ? 'text-hp-pink font-semibold' : ''}`}>
                    {d.blocker_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablePanel>
      </div>

      {/* Missing reporters — executive sees at a glance */}
      {missing && missing.length > 0 && (
        <div className="mb-8 p-5 border border-hp-pink bg-pink-50">
          <p className="eyebrow text-sm text-hp-pink mb-3">{missing.length} người chưa nộp báo cáo hôm nay</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((m) => (
              <span key={m.user_id} className="text-xs bg-white border border-hp-rule px-2 py-1">
                {m.full_name} ({m.department_name ?? dash})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        <PriorityBars data={priorityDist} />
        <TopContributors data={topContrib} />
      </div>

      <ActivityFeed data={recent} />
    </AppShell>
  );
}
