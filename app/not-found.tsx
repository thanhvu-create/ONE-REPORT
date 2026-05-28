'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredUser, rolePath } from '@/lib/auth';
import { useT } from '@/lib/i18n/locale-context';

export default function NotFound() {
  const t = useT();
  const [homeHref, setHomeHref] = useState('/login');
  const [homeLabel, setHomeLabel] = useState<'role' | 'login'>('login');

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setHomeHref(rolePath(u.role));
      setHomeLabel('role');
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-hp-foundation px-6">
      <div className="max-w-xl w-full">
        <div className="flex items-baseline gap-8">
          <span className="font-title text-[120px] leading-none text-hp-ink tabular-nums">404</span>
          <div className="h-24 w-px bg-hp-rule" />
          <div>
            <span className="block eyebrow mb-2">{t('notfound.eyebrow')}</span>
            <h1 className="font-title text-2xl text-hp-ink leading-tight">
              {t('notfound.title')}
            </h1>
            <p className="mt-3 text-sm text-hp-body leading-relaxed max-w-sm">
              {t('notfound.body')}
            </p>
          </div>
        </div>
        <div className="mt-10 hp-divider" />
        <div className="mt-8 flex items-center gap-6">
          <Link
            href={homeHref}
            className="inline-flex items-center bg-hp-ink text-hp-foundation uppercase tracking-eyebrow text-xs px-[22px] py-[14px] rounded-sm hover:bg-hp-pink transition-colors duration-150"
          >
            {homeLabel === 'role' ? t('notfound.cta_dashboard') : t('notfound.cta_login')}
          </Link>
          <Link href="/login" className="eyebrow text-hp-muted hover:text-hp-ink transition-colors duration-150">
            {t('notfound.cta_login_secondary')}
          </Link>
        </div>
      </div>
    </div>
  );
}
