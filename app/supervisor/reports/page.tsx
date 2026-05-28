'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { swrFetcher, api, ApiError } from '@/lib/api';
import { getStoredToken } from '@/lib/auth';
import { Department, Priority, ReportListResponse, ReportRecord, ReportStatus, ReportType } from '@/lib/types';

export default function SupervisorReportsPage() {
  const [priority, setPriority] = useState<Priority | ''>('');
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [hasBlocker, setHasBlocker] = useState<'true' | 'false' | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [flagging, setFlagging] = useState<number | null>(null);
  const [flagNote, setFlagNote] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (priority) p.set('priority', priority);
    if (status) p.set('status', status);
    if (reportType) p.set('reportType', reportType);
    if (hasBlocker) p.set('hasBlocker', hasBlocker);
    if (departmentId) p.set('departmentId', departmentId);
    if (dateFrom) p.set('dateFrom', new Date(dateFrom).toISOString());
    if (dateTo) p.set('dateTo', new Date(dateTo).toISOString());
    p.set('limit', '100');
    return p.toString();
  }, [priority, status, reportType, hasBlocker, departmentId, dateFrom, dateTo]);

  const { data, mutate } = useSWR<ReportListResponse>(`/reports?${query}`, swrFetcher);
  const { data: departments } = useSWR<Department[]>('/departments', swrFetcher);

  async function handleExport() {
    const token = getStoredToken();
    const res = await fetch(`/api/reports/export?${query}`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function flagReport(id: number) {
    await api.patch(`/reports/${id}/flag`, { note: flagNote });
    setFlagging(null);
    setFlagNote('');
    mutate();
  }

  async function unflagReport(id: number) {
    await api.delete(`/reports/${id}/flag`);
    mutate();
  }

  return (
    <AppShell requiredRoles={['supervisor']}>
      <SectionHeader eyebrow="Giám Sát Nội Bộ" title="Tất cả báo cáo" />

      {/* Filters */}
      <div className="bg-hp-card border border-hp-rule p-4 mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <Sel label="Phòng ban" value={departmentId} onChange={setDepartmentId}>
          <option value="">Tất cả</option>
          {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Sel>
        <Sel label="Loại báo cáo" value={reportType} onChange={(v) => setReportType(v as ReportType | '')}>
          <option value="">Tất cả</option>
          <option value="status_report">Trạng thái hạng mục</option>
          <option value="performance_review">Đánh giá kết quả</option>
        </Sel>
        <Sel label="Ưu tiên" value={priority} onChange={(v) => setPriority(v as Priority | '')}>
          <option value="">Tất cả</option>
          <option value="urgent">Khẩn cấp</option>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
        </Sel>
        <Sel label="Blocker" value={hasBlocker} onChange={(v) => setHasBlocker(v as 'true' | 'false' | '')}>
          <option value="">Tất cả</option>
          <option value="true">Có blocker</option>
          <option value="false">Không có</option>
        </Sel>
        <Sel label="Trạng thái" value={status} onChange={(v) => setStatus(v as ReportStatus | '')}>
          <option value="">Tất cả</option>
          <option value="submitted">Đã nộp</option>
          <option value="reviewed">Đã xem</option>
          <option value="flagged">Đã flag</option>
          <option value="resolved">Đã xử lý</option>
        </Sel>
        <DateInput label="Từ ngày" value={dateFrom} onChange={setDateFrom} />
        <DateInput label="Đến ngày" value={dateTo} onChange={setDateTo} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-hp-muted">{data?.total ?? 0} báo cáo</p>
        <button
          onClick={() => handleExport()}
          className="eyebrow text-xs text-hp-muted hover:text-hp-ink border border-hp-rule px-3 py-1.5"
        >
          Export CSV
        </button>
      </div>

      <div className="space-y-3">
        {data?.items.map((r) => (
          <div key={r.id} className={`border bg-hp-card ${r.isFlagged ? 'border-hp-pink' : 'border-hp-rule'}`}>
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{r.user.fullName}</p>
                  <p className="text-xs text-hp-muted">{r.department?.name ?? '—'} · {new Date(r.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-hp-muted">
                    {r.reportType === 'status_report' ? 'Trạng thái hạng mục' : 'Đánh giá kết quả'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <PriorityBadge value={r.aiPriority} />
                  <StatusBadge value={r.status} />
                  {r.isFlagged && <span className="eyebrow text-xs px-2 py-0.5 bg-hp-pink text-white">FLAGGED</span>}
                  {r.hasBlocker && <span className="eyebrow text-xs px-2 py-0.5 bg-red-100 text-red-700">BLOCKER</span>}
                </div>
              </div>

              {r.isFlagged && r.flagNote && (
                <div className="mb-3 p-3 bg-pink-50 border border-hp-pink text-sm">
                  <span className="eyebrow text-xs">Ghi chú flag:</span> {r.flagNote}
                </div>
              )}

              <ReportPreview report={r} />

              {/* Comments */}
              {r.comments?.length > 0 && (
                <div className="mt-3 border-t border-hp-rule pt-3 space-y-1">
                  {r.comments.map((c) => (
                    <p key={c.id} className="text-sm">
                      <span className="font-medium">{c.user.fullName}:</span> {c.content}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-hp-rule">
                {!r.isFlagged && (
                  <button onClick={() => setFlagging(r.id === flagging ? null : r.id)} className="eyebrow text-xs text-hp-muted hover:text-hp-pink">
                    Flag / Escalate
                  </button>
                )}
                {r.isFlagged && (
                  <button onClick={() => unflagReport(r.id)} className="eyebrow text-xs text-hp-muted hover:text-hp-ink">
                    Bỏ flag
                  </button>
                )}
                <Link href={`/reports/${r.id}`} className="eyebrow text-xs text-hp-muted hover:text-hp-ink ml-auto">
                  Xem chi tiết →
                </Link>
              </div>

              {flagging === r.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={flagNote} onChange={(e) => setFlagNote(e.target.value)}
                    placeholder="Ghi chú lý do flag (optional)..."
                    className="flex-1 border border-hp-rule px-3 py-2 text-sm"
                  />
                  <button onClick={() => flagReport(r.id)} className="eyebrow text-xs px-4 py-2 bg-hp-pink text-white">
                    Xác nhận Flag
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function ReportPreview({ report: r }: { report: ReportRecord }) {
  if (r.reportType === 'status_report' && r.statusItems?.length > 0) {
    return (
      <div className="space-y-1 text-sm mb-2">
        {r.statusItems.slice(0, 2).map((item, i) => (
          <div key={i} className="border-l-2 border-hp-rule pl-2">
            <p className="font-medium">{item.name}</p>
            <p className="text-hp-muted text-xs">{item.currentStatus}</p>
          </div>
        ))}
        {r.statusItems.length > 2 && <p className="text-xs text-hp-muted">+{r.statusItems.length - 2} hạng mục khác</p>}
      </div>
    );
  }
  if (r.reportType === 'performance_review' && r.performanceData) {
    return (
      <div className="text-sm mb-2 space-y-1">
        {r.performanceData.achievements && <p><span className="eyebrow text-xs">Đạt:</span> {r.performanceData.achievements.slice(0, 100)}</p>}
        {r.performanceData.gaps && <p><span className="eyebrow text-xs">Chưa đạt:</span> {r.performanceData.gaps.slice(0, 100)}</p>}
      </div>
    );
  }
  return null;
}

function Sel({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1 text-xs">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-sm focus:outline-none focus:border-hp-pink">
        {children}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1 text-xs">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent border-0 border-b border-hp-rule pb-1 text-sm focus:outline-none focus:border-hp-pink" />
    </label>
  );
}
