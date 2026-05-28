'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HpButton } from '@/components/ui/HpButton';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { api, ApiError } from '@/lib/api';
import { ReportRecord, StatusItem, Priority } from '@/lib/types';

type Tab = 'form' | 'voice' | 'paste';

const EMPTY_ITEM = (): StatusItem => ({
  name: '',
  currentStatus: '',
  nextSteps: '',
  deadline: '',
  proposal: '',
  needsSupport: false,
  priority: 'medium',
  hasBlocker: false,
});

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'urgent', label: 'Khẩn cấp' },
];

export default function SubmitStatusReportPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('form');
  const [items, setItems] = useState<StatusItem[]>([EMPTY_ITEM()]);
  const [audio, setAudio] = useState<{ blob: Blob; name: string; mime: string } | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportRecord | null>(null);
  const [aiFilledBanner, setAiFilledBanner] = useState<{ itemCount: number; transcript: string } | null>(null);
  const [voiceReportType, setVoiceReportType] = useState<'status_report' | 'performance_review'>('status_report');

  useEffect(() => {
    const raw = sessionStorage.getItem('hp_voice_prefill');
    if (!raw) return;
    sessionStorage.removeItem('hp_voice_prefill');
    try {
      const { type, data } = JSON.parse(raw) as { type: string; data: { items?: StatusItem[]; transcript: string } };
      if (type !== 'status_report') return;
      const parsed = (data.items ?? []).map((item) => ({
        name: item.name ?? '',
        currentStatus: item.currentStatus ?? '',
        nextSteps: item.nextSteps ?? '',
        deadline: item.deadline ?? '',
        proposal: item.proposal ?? '',
        needsSupport: Boolean(item.needsSupport),
        priority: (item.priority as Priority) ?? 'medium',
        hasBlocker: Boolean(item.hasBlocker),
      }));
      setItems(parsed.length > 0 ? parsed : [EMPTY_ITEM()]);
      setAiFilledBanner({ itemCount: parsed.length, transcript: data.transcript });
      setTab('form');
    } catch { /* ignore malformed session data */ }
  }, []);

  function updateItem(idx: number, field: keyof StatusItem, value: unknown) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    if (items.length < 10) setItems((prev) => [...prev, EMPTY_ITEM()]);
  }

  function removeItem(idx: number) {
    if (items.length > 1) setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // ─── Submit form (all inputs end here) ──────────────────────────────────
  async function submitForm(e: FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true); setResult(null);
    try {
      const r = await api.post<ReportRecord>('/reports/status', { items });
      setResult(r);
      setItems([EMPTY_ITEM()]);
      setAiFilledBanner(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gửi báo cáo thất bại');
    } finally { setLoading(false); }
  }

  // ─── Voice: AI parse only → pre-fill form for review ───────────────────
  async function parseVoice() {
    if (!audio) { setError('Vui lòng ghi âm trước khi phân tích'); return; }
    setError(null); setLoading(true);
    try {
      const form = new FormData();
      form.append('file', new File([audio.blob], audio.name, { type: audio.mime }));
      form.append('reportType', voiceReportType);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await api.post<any>('/reports/voice/parse', form);

      if (voiceReportType === 'performance_review') {
        sessionStorage.setItem('hp_voice_prefill', JSON.stringify({ type: 'performance_review', data: r }));
        router.push('/submit/performance-review');
        return;
      }

      const parsed = (r.items ?? []).map((item: StatusItem) => ({
        name: item.name ?? '',
        currentStatus: item.currentStatus ?? '',
        nextSteps: item.nextSteps ?? '',
        deadline: item.deadline ?? '',
        proposal: item.proposal ?? '',
        needsSupport: Boolean(item.needsSupport),
        priority: (item.priority as Priority) ?? 'medium',
        hasBlocker: Boolean(item.hasBlocker),
      }));
      setItems(parsed.length > 0 ? parsed : [EMPTY_ITEM()]);
      setAiFilledBanner({ itemCount: parsed.length, transcript: r.transcript });
      setAudio(null);
      setTab('form');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI phân tích thất bại — bạn có thể điền tay');
    } finally { setLoading(false); }
  }

  // ─── Paste Task Tracker → pre-fill form for review ──────────────────────
  async function parsePaste(e: FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true); setResult(null);
    try {
      const r = await api.post<{ report: ReportRecord; ai_filled: boolean; item_count: number }>(
        '/reports/from-task-tracker', { rawText: pasteText },
      );
      setResult(r.report);
      setPasteText('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Convert Task Tracker thất bại');
    } finally { setLoading(false); }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'form', label: 'Điền form' },
    { key: 'voice', label: 'Ghi âm' },
    { key: 'paste', label: 'Paste Task Tracker' },
  ];

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Báo cáo thường kỳ"
        title="Báo cáo Trạng thái Hạng mục"
        description="Cập nhật tiến độ công việc — Thứ 4 và Thứ 7 hàng tuần"
      />

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-6 border-b border-hp-rule">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`eyebrow pb-3 -mb-px transition-colors duration-150 ${
              tab === key ? 'text-hp-ink border-b-2 border-hp-pink' : 'text-hp-muted hover:text-hp-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Điền form ─── */}
      {tab === 'form' && (
        <form onSubmit={submitForm} className="max-w-4xl space-y-8">

          {/* AI pre-fill banner */}
          {aiFilledBanner && (
            <div className="border border-yellow-300 bg-yellow-50 p-4">
              <p className="eyebrow text-xs text-yellow-700 mb-1">
                AI đã điền {aiFilledBanner.itemCount} hạng mục từ giọng nói — vui lòng kiểm tra và chỉnh sửa trước khi gửi
              </p>
              <details className="mt-2">
                <summary className="eyebrow text-xs text-yellow-600 cursor-pointer">Xem bản ghi gốc</summary>
                <p className="mt-2 text-sm text-hp-body whitespace-pre-wrap">{aiFilledBanner.transcript}</p>
              </details>
            </div>
          )}

          {items.map((item, idx) => (
            <div key={idx} className="border border-hp-rule p-6 relative">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow text-hp-muted">Hạng mục {idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-xs text-hp-muted hover:text-hp-pink">
                    Xoá
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Field label="Tên hạng mục *" required>
                  <input
                    value={item.name} onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    required className="hp-input w-full"
                    placeholder="Tên công việc / dự án / hạng mục"
                  />
                </Field>

                <Field label="Hiện trạng *" required>
                  <textarea
                    value={item.currentStatus} onChange={(e) => updateItem(idx, 'currentStatus', e.target.value)}
                    required rows={3} className="hp-input w-full"
                    placeholder="Đang ở bước nào, tiến độ thực tế"
                  />
                </Field>

                <Field label="Bước kế tiếp *" required>
                  <textarea
                    value={item.nextSteps} onChange={(e) => updateItem(idx, 'nextSteps', e.target.value)}
                    required rows={2} className="hp-input w-full"
                    placeholder="Việc cần làm tiếp theo"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Deadline *" required>
                    <input
                      type="date" value={item.deadline ?? ''} onChange={(e) => updateItem(idx, 'deadline', e.target.value)}
                      required className="hp-input w-full"
                    />
                  </Field>
                  <Field label="Mức độ ưu tiên *">
                    <select
                      value={item.priority} onChange={(e) => updateItem(idx, 'priority', e.target.value as Priority)}
                      className="hp-input w-full"
                    >
                      {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>

                <Field label="Đề xuất / Ghi chú">
                  <textarea
                    value={item.proposal ?? ''} onChange={(e) => updateItem(idx, 'proposal', e.target.value)}
                    rows={2} className="hp-input w-full"
                    placeholder="Đề xuất, yêu cầu thêm thông tin..."
                  />
                </Field>

                <div className="flex gap-6">
                  <Toggle
                    label="Cần hỗ trợ"
                    checked={item.needsSupport}
                    onChange={(v) => updateItem(idx, 'needsSupport', v)}
                  />
                  <Toggle
                    label="Có Blocker"
                    checked={item.hasBlocker}
                    onChange={(v) => updateItem(idx, 'hasBlocker', v)}
                    danger
                  />
                </div>
              </div>
            </div>
          ))}

          {items.length < 10 && (
            <button type="button" onClick={addItem} className="eyebrow text-hp-muted hover:text-hp-ink flex items-center gap-2">
              + Thêm hạng mục
            </button>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 pt-4 border-t border-hp-rule">
            <HpButton type="submit" loading={loading} loadingLabel="Đang gửi...">
              Gửi báo cáo
            </HpButton>
            {error && <span className="text-xs text-hp-pink">{error}</span>}
          </div>
        </form>
      )}

      {/* ─── Tab: Ghi âm ─── */}
      {tab === 'voice' && (
        <div className="max-w-3xl">
          <p className="text-sm text-hp-muted mb-6">
            Ghi âm tự do — AI sẽ phân tích và điền vào form. Bạn có thể chỉnh sửa kết quả trước khi gửi.
          </p>
          <div className="mb-5">
            <label className="eyebrow text-xs block mb-1">Loại báo cáo sẽ ghi âm</label>
            <select
              value={voiceReportType}
              onChange={(e) => setVoiceReportType(e.target.value as 'status_report' | 'performance_review')}
              className="hp-input"
            >
              <option value="status_report">Báo cáo Trạng thái Hạng mục</option>
              <option value="performance_review">Đánh giá Kết quả</option>
            </select>
            {voiceReportType === 'performance_review' && (
              <p className="mt-1 text-xs text-hp-muted">Sau khi phân tích, bạn sẽ được chuyển sang trang Đánh giá Kết quả.</p>
            )}
          </div>
          <VoiceRecorder onCaptured={(blob, name, mime) => setAudio({ blob, name, mime })} onCleared={() => setAudio(null)} disabled={loading} />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <HpButton onClick={parseVoice} loading={loading} loadingLabel="AI đang phân tích..." disabled={!audio}>
              AI phân tích → điền form
            </HpButton>
            {error && <span className="text-xs text-hp-pink">{error}</span>}
          </div>
          <p className="mt-4 text-xs text-hp-muted">
            Sau khi AI điền xong, bạn sẽ được chuyển sang form để kiểm tra và chỉnh sửa trước khi gửi.
          </p>
        </div>
      )}

      {/* ─── Tab: Paste Task Tracker ─── */}
      {tab === 'paste' && (
        <form onSubmit={parsePaste} className="max-w-3xl">
          <p className="text-sm text-hp-muted mb-4">
            Copy dữ liệu thô từ Google Sheet Task Tracker và paste vào đây — AI sẽ tự convert thành báo cáo trạng thái.
          </p>
          <label className="block eyebrow mb-2">Dữ liệu Task Tracker *</label>
          <textarea
            value={pasteText} onChange={(e) => setPasteText(e.target.value)}
            required rows={14} className="hp-input w-full font-mono text-sm"
            placeholder="Paste dữ liệu từ Google Sheet vào đây..."
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <HpButton type="submit" loading={loading} loadingLabel="AI đang convert...">
              Convert & Gửi
            </HpButton>
            {error && <span className="text-xs text-hp-pink">{error}</span>}
          </div>
        </form>
      )}

      {/* ─── Result ─── */}
      {result && (
        <div className="mt-12 max-w-4xl border border-hp-rule p-6 bg-white">
          <p className="eyebrow text-hp-muted mb-4">Đã gửi thành công</p>
          <SubmittedStatusReport report={result} />
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block eyebrow mb-1 text-xs">{label}{required && ' *'}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, danger }: { label: string; checked: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative ${checked ? (danger ? 'bg-hp-pink' : 'bg-hp-ink') : 'bg-hp-rule'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="eyebrow text-xs">{label}</span>
    </label>
  );
}

function SubmittedStatusReport({ report }: { report: ReportRecord }) {
  const items = report.statusItems ?? [];
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="border-l-2 border-hp-pink pl-4">
          <p className="font-semibold">{item.name}</p>
          <p className="text-sm text-hp-muted mt-1"><span className="eyebrow">Hiện trạng:</span> {item.currentStatus}</p>
          <p className="text-sm text-hp-muted"><span className="eyebrow">Bước kế tiếp:</span> {item.nextSteps}</p>
          <div className="flex gap-3 mt-1">
            <span className={`text-xs eyebrow px-2 py-0.5 ${item.priority === 'urgent' || item.priority === 'high' ? 'bg-hp-pink text-white' : 'bg-hp-rule text-hp-ink'}`}>
              {item.priority.toUpperCase()}
            </span>
            {item.hasBlocker && <span className="text-xs eyebrow px-2 py-0.5 bg-red-100 text-red-700">BLOCKER</span>}
            {item.needsSupport && <span className="text-xs eyebrow px-2 py-0.5 bg-yellow-100 text-yellow-700">CẦN HỖ TRỢ</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
