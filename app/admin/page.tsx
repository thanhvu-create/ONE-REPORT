'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, rolePath } from '@/lib/auth';
import { useT } from '@/lib/i18n/locale-context';

export default function AdminIndex() {
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/admin/users');
    } else {
      router.replace(rolePath(user.role));
    }
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-hp-muted eyebrow">
      {t('common.loading')}
    </div>
  );
}
