'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HpButton } from '@/components/ui/HpButton';
import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { api, ApiError } from '@/lib/api';
import { ReportRecord, ReviewPeriod, REVIEW_PERIOD_LABELS } from '@/lib/types';

type Tab = 'form' | 'voice';

interface FormState {
  achievements: string;
  achievedKpis: string;
  gaps: string;
  gapReasons: string;
  opportunities: string;
  needsDirectionAdjustment: boolean;
  directionAdjustmentDetails: string;
  reviewPeriod: ReviewPeriod;
  needsSupport: boolean;
}

const INITIAL: FormState = {
  achievements: '',
  achievedKpis: '',
  gaps: '',
  gapReasons: '',
  opportunities: '',
  needsDirectionAdjustment: false,
  directionAdjustmentDetails: '',
  reviewPeriod: 'weekly',
  needsSupport: false,
};

export default function SubmitPerformanceReviewPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('form');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [audio, setAudio] = useState<{ blob: Blob; name: string; mime: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportRecord | null>(null);
  const [aiFilledBanner, setAiFilledBanner] = useState<{ transcript: string } | null>(null);
  const [voiceReportType, setVoiceReportType] = useState<'status_report' | 'performance_review'>('performance_review');

  useEffect(() => {
    const raw = sessionStorage.getItem('hp_voice_prefill');
    if (!raw) return;
    sessionStorage.removeItem('hp_voice_prefill');
    try {
      const { type, data } = JSON.parse(raw) as {
        type: string;
        data: {
          transcript: string;
          achievements?: string; achievedKpis?: string;
          gaps?: string; gapReasons?: string; opportunities?: string;
          needsDirectionAdjustment?: boolean; directionAdjustmentDetails?: string;
        };
      };
      if (type !== 'performance_review') return;
      setForm((prev) => ({
        ...prev,
        achievements: data.achievements ?? '',
        achievedKpis: data.achievedKpis ?? '',
        gaps: data.gaps ?? '',
        gapReasons: data.gapReasons ?? '',
        opportunities: data.opportunities ?? '',
        needsDirectionAdjustment: Boolean(data.needsDirectionAdjustment),
        directionAdjustmentDetails: data.directionAdjustmentDetails ?? '',
      }));
      setAiFilledBanner({ transcript: data.transcript });
      setTab('form');
    } catch { /* ignore malformed session data */ }
  }, []);

  function update(field: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Submit form ────────────────────────────────────────────────────────
  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (form.gapReasons.trim().length < 10) {
      setError('Lý do chưa đạt cần cụ thể hơn (tối thiểu 10 ký tự)');
      return;
    }
    setError(null); setLoading(true); setResult(null);
    try {
      const r = await api.post<ReportRecord>('/reports/performance', form);
      setResult(r);
      setForm(INITIAL);
      setAiFilledBanner(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gửi đánh giá thất bại');
    } finally { setLoading(false); }
  }

  // ─── Voice: AI parse only → pre-fill form for review ───────────────────
  async function parseVoice() {
    if (!audio) { setError('Vui lòng ghi âm trước khi phân tích'); return; }
    setError(null); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', new File([audio.blob], audio.name, { type: audio.mime }));
      fd.append('reportType', voiceReportType);
      fd.append('reviewPeriod', form.reviewPeriod);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await api.post<any>('/reports/voice/parse', fd);

      if (voiceReportType === 'status_report') {
        sessionStorage.setItem('hp_voice_prefill', JSON.stringify({ type: 'status_report', data: r }));
        router.push('/submit/status-report');
        return;
      }

      setForm((prev) => ({
        ...prev,
        achievements: r.achievements ?? '',
        achievedKpis: r.achievedKpis ?? '',
        gaps: r.gaps ?? '',
        gapReasons: r.gapReasons ?? '',
        opportunities: r.opportunities ?? '',
        needsDirectionAdjustment: Boolean(r.needsDirectionAdjustment),
        directionAdjustmentDetails: r.directionAdjustmentDetails ?? '',
      }));
      setAiFilledBanner({ transcript: r.transcript });
      setAudio(null);
      setTab('form');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI phân tích thất bại — bạn có thể điền tay');
    } finally { setLoading(false); }
  }

  return (
    <AppShell>
      <SectionHeader
        eyebrow="Đánh giá định kỳ"
        title="Đánh giá Kết quả"
        description="Không phải 'đã làm gì' — mà là 'đã đạt gì so với định hướng'"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-6 border-b border-hp-rule">
        {(['form', 'voice'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`eyebrow pb-3 -mb-px transition-colors duration-150 ${
              tab === key ? 'text-hp-ink border-b-2 border-hp-pink' : 'text-hp-muted hover:text-hp-ink'
            }`}
          >
            {key === 'form' ? 'Điền form' : 'Ghi âm'}
          </button>
        ))}
      </div>

      {/* Period selector (shared between tabs) */}
      <div className="mb-6 flex flex-wrap gap-3">
        {(Object.entries(REVIEW_PERIOD_LABELS) as [ReviewPeriod, string][]).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => update('reviewPeriod', val)}
            className={`eyebrow text-xs px-4 py-2 border transition-colors ${
              form.reviewPeriod === val ? 'border-hp-ink bg-hp-ink text-white' : 'border-hp-rule text-hp-muted hover:border-hp-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Form ─── */}
      {tab === 'form' && (
        <form onSubmit={submitForm} className="max-w-3xl space-y-6">

          {/* AI pre-fill banner */}
          {aiFilledBanner && (
            <div className="border border-yellow-300 bg-yellow-50 p-4">
              <p className="eyebrow text-xs text-yellow-700 mb-1">
                AI đã điền các phần từ giọng nói — vui lòng kiểm tra và chỉnh sửa trước khi gửi
              </p>
              <details className="mt-2">
                <summary className="eyebrow text-xs text-yellow-600 cursor-pointer">Xem bản ghi gốc</summary>
                <p className="mt-2 text-sm text-hp-body whitespace-pre-wrap">{aiFilledBanner.transcript}</p>
              </details>
            </div>
          )}

          <Section
            number="1"
            title="Kết quả đạt được"
            hint="Những hạng mục hoàn thành đúng định hướng"
          >
            <TextareaField
              label="Kết quả cụ thể *"
              value={form.achievements}
              onChange={(v) => update('achievements', v)}
              required
              placeholder="Liệt kê những gì đã hoàn thành đúng hướng..."
            />
            <TextareaField
              label="KPI đạt / vượt *"
              value={form.achievedKpis}
              onChange={(v) => update('achievedKpis', v)}
              required
              placeholder="Doanh thu, tỷ lệ chuyển đổi, số task hoàn thành đúng hạn..."
            />
          </Section>

          <Section
            number="2"
            title="Chưa đạt / Thất bại"
            hint="Không được ghi chung chung — phải có lý do cụ thể"
          >
            <TextareaField
              label="Mục tiêu chưa đạt *"
              value={form.gaps}
              onChange={(v) => update('gaps', v)}
              required
              placeholder="Liệt kê những KPI/hạng mục không đạt..."
            />
            <TextareaField
              label="Lý do thực tế * (cụ thể, không nói chung chung)"
              value={form.gapReasons}
              onChange={(v) => update('gapReasons', v)}
              required
              rows={4}
              placeholder="Ví dụ: Thiếu dữ liệu từ phòng X, tool A lỗi trong 3 ngày, khách hàng chưa phản hồi hợp đồng..."
            />
          </Section>

          <Section number="3" title="Cơ hội & Cải tiến">
            <TextareaField
              label="Insight rút ra / Cơ hội mới"
              value={form.opportunities}
              onChange={(v) => update('opportunities', v)}
              placeholder="Điều gì đáng để thay đổi quy trình, mở rộng, hoặc khai thác..."
            />
          </Section>

          <Section number="4" title="Điều chỉnh Định hướng">
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.needsDirectionAdjustment}
                onChange={(e) => update('needsDirectionAdjustment', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Cần điều chỉnh chiến lược / định hướng</span>
            </label>
            {form.needsDirectionAdjustment && (
              <TextareaField
                label="Điều chỉnh cụ thể gì?"
                value={form.directionAdjustmentDetails}
                onChange={(v) => update('directionAdjustmentDetails', v)}
                placeholder="Mô tả thay đổi chiến lược cần thực hiện..."
              />
            )}
          </Section>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={form.needsSupport}
                onChange={(e) => update('needsSupport', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Cần hỗ trợ từ cấp trên / bộ phận khác</span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <HpButton type="submit" loading={loading} loadingLabel="Đang gửi...">
                Gửi đánh giá
              </HpButton>
              {error && <span className="text-xs text-hp-pink">{error}</span>}
            </div>
          </div>
        </form>
      )}

      {/* ─── Tab: Voice ─── */}
      {tab === 'voice' && (
        <div className="max-w-3xl">
          <p className="text-sm text-hp-muted mb-6">
            Nói tự do về kết quả đạt được, điểm chưa đạt và lý do — AI sẽ phân tích và điền vào form. Bạn có thể chỉnh sửa trước khi gửi.
          </p>
          <div className="mb-5">
            <label className="eyebrow text-xs block mb-1">Loại báo cáo sẽ ghi âm</label>
            <select
              value={voiceReportType}
              onChange={(e) => setVoiceReportType(e.target.value as 'status_report' | 'performance_review')}
              className="hp-input"
            >
              <option value="performance_review">Đánh giá Kết quả</option>
              <option value="status_report">Báo cáo Trạng thái Hạng mục</option>
            </select>
            {voiceReportType === 'status_report' && (
              <p className="mt-1 text-xs text-hp-muted">Sau khi phân tích, bạn sẽ được chuyển sang trang Báo cáo Trạng thái.</p>
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

      {/* ─── Result ─── */}
      {result && (
        <div className="mt-12 max-w-3xl border border-hp-rule p-6 bg-white">
          <p className="eyebrow text-hp-muted mb-4">Đã gửi đánh giá thành công</p>
          <div className="space-y-4 text-sm">
            {result.performanceData?.achievements && (
              <ResultSection title="Kết quả đạt được" content={result.performanceData.achievements} />
            )}
            {result.performanceData?.gaps && (
              <ResultSection title="Chưa đạt" content={result.performanceData.gaps} />
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Section({ number, title, hint, children }: { number: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border border-hp-rule p-6">
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-hp-pink font-bold text-lg">{number}</span>
        <div>
          <p className="font-semibold">{title}</p>
          {hint && <p className="text-xs text-hp-muted mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function TextareaField({
  label, value, onChange, required, rows = 3, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="block eyebrow text-xs mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="hp-input w-full"
      />
    </div>
  );
}

function ResultSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="eyebrow text-xs text-hp-muted mb-1">{title}</p>
      <p className="whitespace-pre-wrap">{content}</p>
    </div>
  );
}
