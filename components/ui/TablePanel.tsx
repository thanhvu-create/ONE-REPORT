'use client';

import { useT } from '@/lib/i18n/locale-context';

interface TablePanelProps {
  children: React.ReactNode;
  /** Show swipe hint on viewports where horizontal scroll is expected */
  scrollHint?: boolean;
  className?: string;
}

export function TablePanel({ children, scrollHint = true, className }: TablePanelProps) {
  const t = useT();
  return (
    <div className={className}>
      {scrollHint && (
        <p className="mb-2 text-[10px] uppercase tracking-eyebrow text-hp-muted md:hidden">{t('common.swipe_hint')}</p>
      )}
      <div className="table-scroll">{children}</div>
    </div>
  );
}
