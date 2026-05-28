'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataCard, MetaRow } from '@/components/ui/DataCard';
import { TablePanel } from '@/components/ui/TablePanel';
import { swrFetcher, api, ApiError } from '@/lib/api';
import { Priority, ReportListResponse, ReportRecord, ReportStatus, ReportType } from '@/lib/types';

function reportSummary(r: ReportRecord) {
  if (r.reportType === 'status_report') {
    const first = r.statusItems?.[0];
    return first ? `${first.name}: ${first.currentStatus}`.slice(0, 120) : '—';
  }
  return r.performanceData?.achievements?.slice(0, 120) ?? '—';
}

export default function LeaderReportsPage() {
  const [priority, setPriority] = useState<Priority | ''>('');
  const [status, setStatus] = useState<ReportStatus | ''>('');
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [hasBlocker, setHasBlocker] = useState<'true' | 'false' | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [comment, setComment] = useState<{ reportId: number; text: string } | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (priority) p.set('priority', priority);
    if (status) p.set('status', status);
    if (reportType) p.set('reportType', reportType);
    if (hasBlocker) p.set('hasBlocker', hasBlocker);
    if (dateFrom) p.set('dateFrom', new Date(dateFrom).toISOString());
    if (dateTo) p.set('dateTo', new Date(dateTo).toISOString());
    p.set('limit', '100');
    return p.toString();
  }, [priority, status, reportType, hasBlocker, dateFrom, dateTo]);

  const { data, mutate } = useSWR<ReportListResponse>(`/reports?${query}`, swrFetcher);

  async function markReviewed(id: number) {
    await api.patch(`/reports/${id}/status`, { status: 'reviewed' });
    mutate();
  }

  async function submitComment(reportId: number) {
    if (!comment || !comment.text.trim()) return;
    setCommentLoading(true);
    setCommentError(null);
    try {
      await api.post(`/reports/${reportId}/comments`, { content: comment.text });
      setComment(null);
      mutate();
    } catch (err) {
      setCommentError(err instanceof ApiError ? err.message : 'Lỗi khi gửi comment');
    } finally {
      setCommentLoading(false);
    }
  }

  return (
    <AppShell requiredRoles={['leader']}>
      <SectionHeader eyebrow="Trưởng Phòng" title="Báo cáo phòng ban" />

      {/* Filters */}
      <div className="bg-hp-card border border-hp-rule p-4 mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
          <option value="true">Chỉ có blocker</option>
          <option value="false">Không có blocker</option>
        </Sel>
        <Sel label="Trạng thái" value={status} onChange={(v) => setStatus(v as ReportStatus | '')}>
          <option value="">Tất cả</option>
          <option value="submitted">Đã nộp</option>
          <option value="reviewed">Đã xem</option>
          <option value="resolved">Đã xử lý</option>
        </Sel>
        <DateInput label="Từ ngày" value={dateFrom} onChange={setDateFrom} />
        <DateInput label="Đến ngày" value={dateTo} onChange={setDateTo} />
      </div>

      {data?.items.length === 0 && <p className="text-sm text-hp-muted py-4">Không có báo cáo nào</p>}

      <div className="space-y-4">
        {data?.items.map((r) => (
          <div key={r.id} className="border border-hp-rule bg-hp-card">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{r.user.fullName}</p>
                  <p className="text-xs text-hp-muted">{new Date(r.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-hp-muted">
                    {r.reportType === 'status_report' ? 'Trạng thái hạng mục' : 'Đánh giá kết quả'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <PriorityBadge value={r.aiPriority} />
                  <StatusBadge value={r.status} />
                  {r.hasBlocker && <span className="eyebrow text-xs px-2 py-0.5 bg-red-100 text-red-700">BLOCKER</span>}
                  {r.needsSupport && <span className="eyebrow text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700">HỖ TRỢ</span>}
                </div>
              </div>

              {/* Status report items */}
              {r.reportType === 'status_report' && r.statusItems?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {r.statusItems.map((item, i) => (
                    <div key={i} className="border-l-2 border-hp-rule pl-3 text-sm">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-hp-muted">{item.currentStatus}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Performance review */}
              {r.reportType === 'performance_review' && r.performanceData && (
                <div className="text-sm space-y-1 mb-3">
                  {r.performanceData.achievements && <p><span className="eyebrow text-xs">Đạt được:</span> {r.performanceData.achievements.slice(0, 120)}</p>}
                  {r.performanceData.gaps && <p><span className="eyebrow text-xs">Chưa đạt:</span> {r.performanceData.gaps.slice(0, 120)}</p>}
                </div>
              )}

              {/* Comments */}
              {r.comments?.length > 0 && (
                <div className="mt-3 border-t border-hp-rule pt-3 space-y-2">
                  {r.comments.map((c) => (
                    <div key={c.id} className="text-sm">
                      <span className="font-medium">{c.user.fullName}:</span> {c.content}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-hp-rule items-center">
                {r.status === 'submitted' && (
                  <button onClick={() => markReviewed(r.id)} className="eyebrow text-xs text-hp-ink hover:text-hp-pink">
                    Đánh dấu đã xem
                  </button>
                )}
                <button
                  onClick={() => setComment(comment?.reportId === r.id ? null : { reportId: r.id, text: '' })}
                  className="eyebrow text-xs text-hp-muted hover:text-hp-ink"
                >
                  + Thêm comment
                </button>
                <Link href={`/reports/${r.id}`} className="eyebrow text-xs text-hp-muted hover:text-hp-ink ml-auto">
                  Xem chi tiết →
                </Link>
              </div>

              {comment?.reportId === r.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={comment.text}
                    onChange={(e) => setComment({ ...comment, text: e.target.value })}
                    placeholder="Nhập comment..."
                    className="flex-1 border border-hp-rule px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => submitComment(r.id)}
                    disabled={commentLoading || !comment.text.trim()}
                    className="eyebrow text-xs px-4 py-2 bg-hp-ink text-white disabled:opacity-50"
                  >
                    Gửi
                  </button>
                </div>
              )}
              {commentError && <p className="text-xs text-hp-pink mt-1">{commentError}</p>}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
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
