'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeSubmitRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/submit/status-report'); }, [router]);
  return null;
}
