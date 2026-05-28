'use client';

import { LocaleProvider } from '@/lib/i18n/locale-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
