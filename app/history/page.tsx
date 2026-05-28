'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataCard, MetaRow } from '@/components/ui/DataCard';
import { TablePanel } from '@/components/ui/TablePanel';
import { MyPositionWidget } from '@/components/positions/MyPositionWidget';
import { MyTasksWidget } from '@/components/tasks/MyTasksWidget';
import { swrFetcher } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { AuthenticatedUser, ReportListResponse, ReportRecord } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

type ReportTypeFilter = '' | 'status_report' | 'performance_review';

function buildUrl(reportType: ReportTypeFilter, dateFrom: string, dateTo: string): string {
  const params = new URLSearchParams({ limit: '100' });
  if (reportType) params.set('reportType', reportType);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  return `/reports?${params.toString()}`;
}

function reportSummary(r: ReportRecord, dash: string): string {
  if (r.reportType === 'status_report' && r.statusItems?.length > 0) {
    const first = r.statusItems[0];
    return `${first.name}: ${first.currentStatus}`.slice(0, 120);
  }
  if (r.reportType === 'performance_review' && r.performanceData?.achievements) {
    return r.performanceData.achievements.slice(0, 120);
  }
  return r.aiSummary ?? r.originalContent?.slice(0, 120) ?? r.transcript?.slice(0, 120) ?? dash;
}

function reportTypeLabel(r: ReportRecord): string {
  if (r.reportType === 'status_report') return 'Trạng thái hạng mục';
  if (r.reportType === 'performance_review') return 'Đánh giá kết quả';
  return '—';
}

const REPORT_TYPE_OPTIONS: { value: ReportTypeFilter; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'status_report', label: 'Trạng thái hạng mục' },
  { value: 'performance_review', label: 'Đánh giá kết quả' },
];

export default function HistoryPage() {
  const t = useT();
  const dash = t('common.dash');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [filterType, setFilterType] = useState<ReportTypeFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const apiUrl = buildUrl(filterType, dateFrom, dateTo);
  const { data, error, isLoading } = useSWR<ReportListResponse>(apiUrl, swrFetcher);

  useEffect(() => { setUser(getStoredUser()); }, []);

  function clearFilters() {
    setFilterType('');
    setDateFrom('');
    setDateTo('');
  }

  const hasActiveFilters = filterType !== '' || dateFrom !== '' || dateTo !== '';

  return (
    <AppShell requiredRoles={['employee', 'leader']}>
      <div className="flex flex-wrap gap-6 justify-between items-start mb-6">
        <SectionHeader eyebrow={t('history.eyebrow')} title={t('history.title')} />
        <div className="flex flex-col gap-4 w-full sm:w-72 shrink-0">
          {user && <MyPositionWidget user={user} />}
          <MyTasksWidget />
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 border border-hp-rule p-4 bg-hp-inset">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <p className="eyebrow text-xs text-hp-muted mb-1.5">Loại báo cáo</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilterType(opt.value)}
                  className={`eyebrow text-xs px-3 py-1.5 border transition-colors ${
                    filterType === opt.value
                      ? 'border-hp-ink bg-hp-ink text-white'
                      : 'border-hp-rule text-hp-muted hover:border-hp-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block eyebrow text-xs text-hp-muted mb-1.5">Từ ngày</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="hp-input text-sm"
              />
            </div>
            <div>
              <label className="block eyebrow text-xs text-hp-muted mb-1.5">Đến ngày</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="hp-input text-sm"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="eyebrow text-xs text-hp-muted hover:text-hp-ink pb-0.5"
            >
              Xoá bộ lọc
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="eyebrow">{t('common.loading')}</p>}
      {error && <p className="text-xs text-hp-pink">{t('history.cannot_load')}</p>}

      {data && data.items.length === 0 && (
        <div className="bg-hp-inset p-5 sm:p-7">
          <h3 className="font-title text-lg text-hp-ink">
            {hasActiveFilters ? 'Không có báo cáo nào khớp bộ lọc' : t('history.empty_title')}
          </h3>
          {!hasActiveFilters && (
            <p className="mt-2 text-sm text-hp-body">
              {t('history.empty_body_prefix')}
              <Link className="underline" href="/submit/status-report">
                {t('history.empty_body_link')}
              </Link>
              {t('history.empty_body_suffix')}
            </p>
          )}
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          {hasActiveFilters && (
            <p className="eyebrow text-xs text-hp-muted mb-4">
              {data.items.length} kết quả
            </p>
          )}

          <div className="card-list">
            {data.items.map((r) => (
              <DataCard key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <p className="text-xs text-hp-muted tabular-nums">{new Date(r.createdAt).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-2">
                    <PriorityBadge value={r.aiPriority} />
                    <StatusBadge value={r.status} />
                  </div>
                </div>
                <MetaRow label="Loại báo cáo">{reportTypeLabel(r)}</MetaRow>
                <MetaRow label={t('history.col_summary')}>{reportSummary(r, dash)}</MetaRow>
                {r.hasBlocker && (
                  <MetaRow label={t('history.col_blocker')}>
                    <span className="eyebrow text-xs text-red-600">Có blocker</span>
                  </MetaRow>
                )}
                {r.isFlagged && (
                  <MetaRow label="Flag">
                    <span className="eyebrow text-xs text-hp-pink">
                      Đã flag{r.flagNote ? `: ${r.flagNote}` : ''}
                    </span>
                  </MetaRow>
                )}
                {r.comments?.length > 0 && (
                  <MetaRow label="Comment">
                    <span className="text-xs">{r.comments.length} comment(s)</span>
                  </MetaRow>
                )}
                <div className="pt-2 mt-1 border-t border-hp-rule">
                  <Link href={`/reports/${r.id}`} className="eyebrow text-xs text-hp-muted hover:text-hp-ink">
                    Xem chi tiết →
                  </Link>
                </div>
              </DataCard>
            ))}
          </div>

          <TablePanel className="table-desktop">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="bg-hp-inset">
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('history.col_when')}</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">Loại báo cáo</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('history.col_summary')}</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('history.col_priority')}</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">{t('history.col_status')}</th>
                  <th className="text-left eyebrow py-3 px-4 border-b border-hp-rule">Blocker</th>
                  <th className="py-3 px-4 border-b border-hp-rule"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="bg-hp-card hover:bg-hp-inset transition-colors duration-150 border-b border-hp-rule">
                    <td className="py-3 px-4 text-sm text-hp-body tabular-nums whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-hp-body">{reportTypeLabel(r)}</td>
                    <td className="py-3 px-4 text-sm text-hp-body max-w-xs">{reportSummary(r, dash)}</td>
                    <td className="py-3 px-4"><PriorityBadge value={r.aiPriority} /></td>
                    <td className="py-3 px-4"><StatusBadge value={r.status} /></td>
                    <td className="py-3 px-4 eyebrow text-xs">
                      {r.hasBlocker ? <span className="text-red-600">Có</span> : <span className="text-hp-muted">Không</span>}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/reports/${r.id}`} className="eyebrow text-xs text-hp-muted hover:text-hp-ink whitespace-nowrap">
                        Xem →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </>
      )}
    </AppShell>
  );
}
