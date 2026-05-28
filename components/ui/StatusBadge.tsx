'use client';

import { ReportStatus } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

const styleMap: Record<ReportStatus, string> = {
  submitted: 'text-hp-muted',
  reviewed:  'text-hp-ink',
  flagged:   'text-hp-pink',
  resolved:  'text-hp-body',
};

export function StatusBadge({ value }: { value: ReportStatus }) {
  const t = useT();
  return <span className={`eyebrow ${styleMap[value]}`}>{t(`status.${value}`)}</span>;
}
