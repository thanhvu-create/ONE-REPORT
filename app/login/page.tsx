'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { rolePath, saveAuth } from '@/lib/auth';
import { HpButton } from '@/components/ui/HpButton';
import { HpInput } from '@/components/ui/HpInput';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useT } from '@/lib/i18n/locale-context';
import { LoginResponse } from '@/lib/types';

const DEMO_ACCOUNTS = [
  { email: 'admin@ctyhp.vn', password: 'admin123', label: 'Quản trị hệ thống' },
  { email: 'executive@ctyhp.vn', password: 'exec123', label: 'Ban lãnh đạo' },
  { email: 'supervisor@ctyhp.vn', password: 'super123', label: 'Giám sát nội bộ' },
  { email: 'leader@ctyhp.vn', password: 'leader123', label: 'Trưởng phòng' },
  { email: 'employee@ctyhp.vn', password: 'emp123', label: 'Nhân viên' },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>(
        '/auth/login',
        { email, password },
        { auth: false },
      );
      saveAuth(res.access_token, res.user);
      router.replace(rolePath(res.user.role));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('login.error_generic');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-hp-card border-r border-hp-rule">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{t('login.brand')}</span>
          <LanguageSwitcher variant="card" />
        </div>
        <div className="max-w-md">
          <h1 className="font-title text-5xl text-hp-ink leading-tight">
            {t('login.tagline_h1_1')}
            <br /> {t('login.tagline_h1_2')}
          </h1>
          <p className="mt-6 text-hp-body leading-relaxed">{t('login.tagline_p')}</p>
        </div>
        <p className="eyebrow">{t('login.brand')}</p>
      </section>

      <section className="flex min-h-[calc(100dvh-0px)] items-center justify-center p-4 pb-8 safe-area-pad safe-area-pad-bottom sm:p-8 lg:min-h-screen">
        <form onSubmit={onSubmit} className="w-full max-w-sm min-w-0">
          <div className="flex items-center justify-between gap-3 mb-2 lg:hidden">
            <span className="eyebrow">{t('login.eyebrow')}</span>
            <LanguageSwitcher variant="card" />
          </div>
          <span className="eyebrow mb-2 hidden lg:block">{t('login.eyebrow')}</span>
          <h2 className="font-title text-2xl text-hp-ink mb-8 sm:text-3xl sm:mb-10">{t('login.heading')}</h2>

          <HpInput
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <HpInput
            label={t('login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            error={error ?? undefined}
          />
          <HpButton type="submit" loading={loading} loadingLabel={t('login.signing_in')}>
            {t('login.signin')}
          </HpButton>

          <div className="mt-8 pt-6 border-t border-hp-rule">
            <p className="eyebrow text-[10px] mb-3">{t('login.demo_accounts')}</p>
            <ul className="space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.email}>
                  <button
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                    className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 border border-hp-rule bg-hp-inset/40 hover:border-hp-pink transition-colors min-h-[44px]"
                  >
                    <span className="text-sm text-hp-ink shrink-0">{acc.label}</span>
                    <span className="text-[11px] text-hp-muted font-mono truncate text-right">{acc.email}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-hp-muted">{t('login.demo_seeded')}</p>
          </div>

        </form>
      </section>
    </div>
  );
}
