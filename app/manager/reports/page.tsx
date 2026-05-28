'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerReportsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/leader/reports'); }, [router]);
  return null;
}
