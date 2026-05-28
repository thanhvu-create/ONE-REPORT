'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';
import { useT } from '@/lib/i18n/locale-context';

export default function ManagerIndex() {
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin' || user.role === 'leader') {
      router.replace('/leader/dashboard');
    } else {
      router.replace('/employee/submit-report');
    }
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-hp-muted eyebrow">
      {t('common.loading')}
    </div>
  );
}
