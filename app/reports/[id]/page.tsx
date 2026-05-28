'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AppShell } from '@/components/layout/AppShell';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { swrFetcher, api, ApiError } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { AuthenticatedUser, ReportRecord, ReviewPeriod } from '@/lib/types';

const REVIEW_PERIOD_LABELS: Record<ReviewPeriod, string> = {
  weekly: 'Tuần',
  monthly: 'Tháng',
  quarterly: 'Quý',
};

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolveNoteOpen, setResolveNoteOpen] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => { setUser(getStoredUser()); }, []);

  const { data: report, mutate, error } = useSWR<ReportRecord>(
    id ? `/reports/${id}` : null,
    swrFetcher,
  );

  async function markReviewed() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.patch(`/reports/${id}/status`, { status: 'reviewed' });
      mutate();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Lỗi');
    } finally {
      setActionLoading(false);
    }
  }

  async function markResolved() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.patch(`/reports/${id}/status`, { status: 'resolved', note: resolveNote || undefined });
      setResolveNoteOpen(false);
      setResolveNote('');
      mutate();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Lỗi');
    } finally {
      setActionLoading(false);
    }
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/reports/${id}/comments`, { content: commentText });
      setCommentText('');
      setCommenting(false);
      mutate();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Lỗi khi gửi comment');
    } finally {
      setActionLoading(false);
    }
  }

  async function doFlag() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.patch(`/reports/${id}/flag`, { note: flagNote });
      setFlagging(false);
      setFlagNote('');
      mutate();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Lỗi khi flag');
    } finally {
      setActionLoading(false);
    }
  }

  async function doUnflag() {
    setActionLoading(true);
    setActionError(null);
    try {
      await api.delete(`/reports/${id}/flag`);
      mutate();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Lỗi khi bỏ flag');
    } finally {
      setActionLoading(false);
    }
  }

  const role = user?.role;
  const canComment = role === 'leader' || role === 'supervisor' || role === 'executive' || role === 'admin';
  const canChangeStatus = role === 'leader' || role === 'supervisor' || role === 'admin';
  const canResolve = role === 'supervisor' || role === 'admin';
  const canFlag = role === 'supervisor';

  if (error) {
    return (
      <AppShell>
        <p className="text-hp-pink text-sm">Không tải được báo cáo. Có thể bạn không có quyền xem.</p>
        <button onClick={() => router.back()} className="mt-4 eyebrow text-xs text-hp-muted hover:text-hp-ink">
          ← Quay lại
        </button>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <p className="eyebrow text-hp-muted">Đang tải...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="eyebrow text-xs text-hp-muted hover:text-hp-ink mb-6 inline-block"
      >
        ← Quay lại
      </button>

      {/* Header */}
      <div className="border border-hp-rule bg-hp-card p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold text-lg text-hp-ink">{report.user.fullName}</p>
            <p className="text-xs text-hp-muted mt-0.5">
              {report.department?.name ?? '—'} · {new Date(report.createdAt).toLocaleString()}
            </p>
            <p className="text-xs text-hp-muted">
              {report.reportType === 'status_report' ? 'Báo cáo Trạng thái Hạng mục' : 'Đánh giá Kết quả'}
              {report.reviewPeriod && ` · Kỳ: ${REVIEW_PERIOD_LABELS[report.reviewPeriod] ?? report.reviewPeriod}`}
              {report.sourceType === 'voice' && ' · Ghi âm'}
              {report.sourceType === 'task_tracker' && ' · Task Tracker'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PriorityBadge value={report.aiPriority} />
            <StatusBadge value={report.status} />
            {report.isFlagged && (
              <span className="eyebrow text-xs px-2 py-0.5 bg-hp-pink text-white">FLAGGED</span>
            )}
            {report.hasBlocker && (
              <span className="eyebrow text-xs px-2 py-0.5 bg-red-100 text-red-700">BLOCKER</span>
            )}
            {report.needsSupport && (
              <span className="eyebrow text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700">HỖ TRỢ</span>
            )}
          </div>
        </div>

        {/* Flag note */}
        {report.isFlagged && report.flagNote && (
          <div className="p-3 bg-pink-50 border border-hp-pink text-sm mb-4">
            <span className="eyebrow text-xs">Ghi chú flag:</span> {report.flagNote}
          </div>
        )}

        {/* AI Summary (legacy) */}
        {report.aiSummary && (
          <div className="p-3 bg-hp-inset border border-hp-rule text-sm mb-4">
            <span className="eyebrow text-xs block mb-1">Tóm tắt AI</span>
            {report.aiSummary}
          </div>
        )}

        {/* Resolved note */}
        {report.resolvedNote && (
          <div className="p-3 bg-green-50 border border-green-200 text-sm mb-4">
            <span className="eyebrow text-xs text-green-700 block mb-1">Đã giải quyết</span>
            {report.resolvedNote}
            {report.resolvedAt && (
              <span className="text-xs text-hp-muted ml-2">· {new Date(report.resolvedAt).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>

      {/* Status Report: items */}
      {report.reportType === 'status_report' && report.statusItems?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-title text-xl text-hp-ink mb-4">Hạng mục công việc</h2>
          <div className="space-y-3">
            {report.statusItems.map((item, i) => (
              <div key={i} className={`border bg-hp-card p-4 ${item.hasBlocker ? 'border-red-300' : 'border-hp-rule'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-hp-ink">{item.name}</p>
                  <div className="flex gap-2">
                    <span className={`eyebrow text-xs px-2 py-0.5 ${
                      item.priority === 'urgent' ? 'bg-hp-pink text-white' :
                      item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      item.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                      'bg-hp-inset text-hp-muted'
                    }`}>{item.priority?.toUpperCase()}</span>
                    {item.hasBlocker && <span className="eyebrow text-xs px-2 py-0.5 bg-red-100 text-red-700">BLOCKER</span>}
                    {item.needsSupport && <span className="eyebrow text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700">HỖ TRỢ</span>}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="eyebrow text-xs">Trạng thái:</span> {item.currentStatus}</p>
                  {item.nextSteps && <p><span className="eyebrow text-xs">Bước tiếp:</span> {item.nextSteps}</p>}
                  {item.deadline && <p><span className="eyebrow text-xs">Deadline:</span> {item.deadline}</p>}
                  {item.proposal && <p><span className="eyebrow text-xs">Đề xuất:</span> {item.proposal}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Review: structured data */}
      {report.reportType === 'performance_review' && report.performanceData && (
        <div className="mb-6">
          <h2 className="font-title text-xl text-hp-ink mb-4">Nội dung đánh giá</h2>
          <div className="space-y-4">
            {report.performanceData.achievements && (
              <Section title="Kết quả đạt được">{report.performanceData.achievements}</Section>
            )}
            {report.performanceData.achievedKpis && (
              <Section title="KPI đạt được">{report.performanceData.achievedKpis}</Section>
            )}
            {report.performanceData.gaps && (
              <Section title="Chưa đạt / Thất bại">{report.performanceData.gaps}</Section>
            )}
            {report.performanceData.gapReasons && (
              <Section title="Nguyên nhân">{report.performanceData.gapReasons}</Section>
            )}
            {report.performanceData.opportunities && (
              <Section title="Cơ hội & Cải tiến">{report.performanceData.opportunities}</Section>
            )}
            {report.performanceData.needsDirectionAdjustment && (
              <div className="border border-yellow-300 bg-yellow-50 p-4">
                <p className="eyebrow text-xs text-yellow-700 mb-1">Cần điều chỉnh định hướng</p>
                {report.performanceData.directionAdjustmentDetails && (
                  <p className="text-sm">{report.performanceData.directionAdjustmentDetails}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Original text / transcript (voice/legacy) */}
      {(report.transcript || report.originalContent) && (
        <div className="mb-6">
          <h2 className="font-title text-xl text-hp-ink mb-4">
            {report.transcript ? 'Bản ghi giọng nói' : 'Nội dung gốc'}
          </h2>
          <pre className="bg-hp-inset border border-hp-rule p-4 text-sm text-hp-body whitespace-pre-wrap font-body">
            {report.transcript ?? report.originalContent}
          </pre>
        </div>
      )}

      {/* Comments */}
      <div className="mb-6">
        <h2 className="font-title text-xl text-hp-ink mb-4">
          Comments {report.comments?.length > 0 && `(${report.comments.length})`}
        </h2>
        {(!report.comments || report.comments.length === 0) && (
          <p className="text-sm text-hp-muted">Chưa có comment nào.</p>
        )}
        <div className="space-y-3">
          {report.comments?.map((c) => (
            <div key={c.id} className="border border-hp-rule bg-hp-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{c.user.fullName}</span>
                <span className="eyebrow text-xs text-hp-muted">{c.user.role}</span>
                <span className="text-xs text-hp-muted ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-hp-body">{c.content}</p>
            </div>
          ))}
        </div>

        {/* Add comment */}
        {canComment && (
          <div className="mt-4">
            {!commenting ? (
              <button
                onClick={() => setCommenting(true)}
                className="eyebrow text-xs text-hp-muted hover:text-hp-ink"
              >
                + Thêm comment
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Nhập comment..."
                  className="hp-input flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitComment}
                    disabled={actionLoading || !commentText.trim()}
                    className="eyebrow text-xs px-4 py-2 bg-hp-ink text-white disabled:opacity-50"
                  >
                    Gửi
                  </button>
                  <button
                    onClick={() => { setCommenting(false); setCommentText(''); }}
                    className="eyebrow text-xs px-4 py-2 border border-hp-rule text-hp-muted hover:text-hp-ink"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      {(canChangeStatus || canFlag) && (
        <div className="border-t border-hp-rule pt-6">
          <h2 className="font-title text-xl text-hp-ink mb-4">Hành động</h2>
          <div className="flex flex-wrap gap-3">
            {canChangeStatus && report.status === 'submitted' && (
              <button
                onClick={markReviewed}
                disabled={actionLoading}
                className="eyebrow text-xs px-4 py-2 border border-hp-rule text-hp-ink hover:border-hp-pink disabled:opacity-50"
              >
                Đánh dấu đã xem
              </button>
            )}
            {canResolve && (report.status === 'submitted' || report.status === 'reviewed' || report.status === 'flagged') && (
              <>
                {!resolveNoteOpen ? (
                  <button
                    onClick={() => setResolveNoteOpen(true)}
                    className="eyebrow text-xs px-4 py-2 bg-hp-ink text-white hover:opacity-80"
                  >
                    Giải quyết
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 w-full sm:flex-row">
                    <input
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      placeholder="Ghi chú cách xử lý (không bắt buộc)..."
                      className="hp-input flex-1"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={markResolved}
                        disabled={actionLoading}
                        className="eyebrow text-xs px-4 py-2 bg-hp-ink text-white disabled:opacity-50"
                      >
                        Xác nhận
                      </button>
                      <button
                        onClick={() => { setResolveNoteOpen(false); setResolveNote(''); }}
                        className="eyebrow text-xs px-4 py-2 border border-hp-rule text-hp-muted"
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {canFlag && !report.isFlagged && !flagging && (
              <button
                onClick={() => setFlagging(true)}
                className="eyebrow text-xs px-4 py-2 border border-hp-pink text-hp-pink hover:bg-hp-pink hover:text-white"
              >
                Flag / Escalate
              </button>
            )}
            {canFlag && report.isFlagged && (
              <button
                onClick={doUnflag}
                disabled={actionLoading}
                className="eyebrow text-xs px-4 py-2 border border-hp-rule text-hp-muted hover:text-hp-ink disabled:opacity-50"
              >
                Bỏ flag
              </button>
            )}
          </div>

          {flagging && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Ghi chú lý do flag (không bắt buộc)..."
                className="hp-input flex-1"
              />
              <div className="flex gap-2">
                <button
                  onClick={doFlag}
                  disabled={actionLoading}
                  className="eyebrow text-xs px-4 py-2 bg-hp-pink text-white disabled:opacity-50"
                >
                  Xác nhận Flag
                </button>
                <button
                  onClick={() => { setFlagging(false); setFlagNote(''); }}
                  className="eyebrow text-xs px-4 py-2 border border-hp-rule text-hp-muted hover:text-hp-ink"
                >
                  Huỷ
                </button>
              </div>
            </div>
          )}

          {actionError && <p className="mt-3 text-xs text-hp-pink">{actionError}</p>}
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-hp-rule bg-hp-card p-4">
      <p className="eyebrow text-xs mb-2">{title}</p>
      <p className="text-sm text-hp-body whitespace-pre-wrap">{children}</p>
    </div>
  );
}
