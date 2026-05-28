'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, rolePath } from '@/lib/auth';
import { useT } from '@/lib/i18n/locale-context';

export default function EmployeeIndex() {
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    const user = getStoredUser();
    router.replace(user ? rolePath(user.role) : '/login');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-hp-muted eyebrow">
      {t('common.loading')}
    </div>
  );
}
