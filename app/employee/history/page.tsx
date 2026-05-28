'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeHistoryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/history'); }, [router]);
  return null;
}
