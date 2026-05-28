'use client';

import { useEffect, useId, useRef } from 'react';
import { useT } from '@/lib/i18n/locale-context';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
}

export function HpModal({ open, onClose, title, subtitle, eyebrow, children }: Props) {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 safe-area-pad">
      <button
        type="button"
        className="absolute inset-0 bg-hp-ink/40 backdrop-blur-[2px]"
        aria-label={t('common.close_menu')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex w-full max-h-[92dvh] flex-col bg-hp-card border border-hp-rule shadow-xl sm:max-w-lg sm:max-h-[90vh]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hp-rule bg-hp-inset/40 px-5 py-4 sm:px-6 sm:py-5 shrink-0">
          <div className="min-w-0">
            {eyebrow && <span className="eyebrow block mb-1">{eyebrow}</span>}
            <h2 id={titleId} className="font-title text-xl text-hp-ink break-words sm:text-2xl">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-hp-muted mt-1 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 eyebrow text-hp-muted hover:text-hp-ink min-h-[44px] min-w-[44px] px-2 -mr-2"
            aria-label={t('common.close_menu')}
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain flex-1">{children}</div>
      </div>
    </div>
  );
}
