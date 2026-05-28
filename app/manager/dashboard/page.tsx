'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerDashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/leader/dashboard'); }, [router]);
  return null;
}
