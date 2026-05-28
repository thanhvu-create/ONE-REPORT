'use client';

import { ReportRecord } from '@/lib/types';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { useT } from '@/lib/i18n/locale-context';

export function ReportResultCard({ report }: { report: ReportRecord }) {
  const t = useT();
  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div>
          <span className="block eyebrow mb-1">{t('result.submitted')}</span>
          <p className="font-title text-2xl text-hp-ink">{t('result.report_n', { id: report.id })}</p>
          <p className="mt-1 text-xs text-hp-muted">
            {new Date(report.createdAt).toLocaleString()} · {t(`source.${report.sourceType}`)}
          </p>
        </div>
        <PriorityBadge value={report.aiPriority} />
      </div>

      <div className="mt-6">
        <span className="block eyebrow mb-2">{t('result.ai_summary')}</span>
        <p className="text-hp-body leading-relaxed">
          {report.aiSummary ?? t('result.ai_unavailable')}
        </p>
      </div>

      {report.hasBlocker && (
        <div className="mt-6 border-l-2 border-hp-pink pl-4">
          <span className="block eyebrow text-hp-pink mb-1">{t('result.blocker_detected')}</span>
          <p className="text-sm text-hp-body">
            {report.issueCategory ? t(`category.${report.issueCategory}`) : t('result.category_unclassified')}
          </p>
        </div>
      )}

      {report.sourceType === 'voice' && report.transcript && (
        <div className="mt-6">
          <span className="block eyebrow mb-2">{t('result.transcript')}</span>
          <p className="text-sm text-hp-body whitespace-pre-wrap">{report.transcript}</p>
        </div>
      )}

      {report.sourceType === 'text' && report.originalContent && (
        <div className="mt-6">
          <span className="block eyebrow mb-2">{t('result.original_text')}</span>
          <p className="text-sm text-hp-body whitespace-pre-wrap">{report.originalContent}</p>
        </div>
      )}
    </div>
  );
}
