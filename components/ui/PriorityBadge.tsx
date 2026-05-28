'use client';

import { Priority } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

const styleMap: Record<Priority, string> = {
  low: 'text-hp-muted border-hp-rule',
  medium: 'text-hp-body border-hp-rule',
  high: 'text-hp-ink border-hp-ink',
  urgent: 'text-hp-pink border-hp-pink',
};

export function PriorityBadge({ value }: { value: Priority | null | undefined }) {
  const t = useT();
  if (!value) return <span className="eyebrow">{t('common.dash')}</span>;
  return (
    <span className={`inline-block whitespace-nowrap uppercase tracking-eyebrow text-[10px] px-2 py-1 border ${styleMap[value]}`}>
      {t(`priority.${value}`)}
    </span>
  );
}
