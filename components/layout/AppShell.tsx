'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearAuth, getStoredUser } from '@/lib/auth';
import { AuthenticatedUser, Role } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

interface NavLink {
  key: string;
  href: string;
  roles: Role[];
}

const LINKS: NavLink[] = [
  // Employee + Leader: submit both report types, history, direction
  { key: 'nav.submit_status', href: '/submit/status-report', roles: ['employee', 'leader'] },
  { key: 'nav.submit_performance', href: '/submit/performance-review', roles: ['employee', 'leader'] },
  { key: 'nav.history', href: '/history', roles: ['employee', 'leader'] },
  // Task Tracker — all authenticated roles
  { key: 'nav.tasks', href: '/tasks', roles: ['employee', 'leader', 'supervisor', 'executive', 'admin'] },
  { key: 'nav.direction', href: '/direction', roles: ['employee', 'leader', 'supervisor', 'executive'] },
  { key: 'nav.positions', href: '/admin/positions', roles: ['admin', 'leader'] },
  // Leader: department dashboard + reports
  { key: 'nav.dashboard', href: '/leader/dashboard', roles: ['leader'] },
  { key: 'nav.reports', href: '/leader/reports', roles: ['leader'] },
  // Supervisor: company-wide dashboard + reports
  { key: 'nav.dashboard', href: '/supervisor/dashboard', roles: ['supervisor'] },
  { key: 'nav.reports', href: '/supervisor/reports', roles: ['supervisor'] },
  // Executive: read-only overview
  { key: 'nav.dashboard', href: '/executive/dashboard', roles: ['executive'] },
  // Admin
  { key: 'nav.users', href: '/admin/users', roles: ['admin'] },
  { key: 'nav.departments', href: '/admin/departments', roles: ['admin'] },
];

interface Props {
  children: React.ReactNode;
  requiredRoles?: Role[];
}

export function AppShell({ children, requiredRoles }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    if (requiredRoles && !requiredRoles.includes(u.role)) {
      router.replace('/');
      return;
    }
    setUser(u);
  }, [router, requiredRoles]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-hp-muted eyebrow safe-area-pad">
        {t('common.loading')}
      </div>
    );
  }

  const visible = LINKS.filter((l) => l.roles.includes(user.role));

  function logout() {
    clearAuth();
    router.replace('/login');
  }

  function navLinkClass(active: boolean) {
    const base =
      'block w-full text-left px-4 py-3 text-sm font-body transition-colors duration-150 min-h-[44px]';
    return active
      ? `${base} text-hp-ink border-l-2 border-hp-pink bg-hp-inset/60 pl-[14px]`
      : `${base} text-hp-body hover:text-hp-ink hover:bg-hp-inset/40`;
  }

  const sidebar = (
    <>
      <div className="px-4 py-4 border-b border-hp-rule sm:px-5 lg:py-6">
        <span className="block eyebrow mb-1">One Report</span>
        <span className="font-title text-xl text-hp-ink sm:text-2xl">Internal</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 lg:px-2 lg:py-4">
        <ul className="space-y-0.5">
          {visible.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link href={link.href} className={navLinkClass(!!active)} onClick={() => setMenuOpen(false)}>
                  {t(link.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-hp-rule px-4 py-4 space-y-4 sm:px-5">
        <div>
          <span className="block eyebrow mb-1">{t(`role.${user.role}`)}</span>
          <p className="font-body text-sm text-hp-ink break-words">{user.fullName}</p>
          <p className="text-xs text-hp-muted break-all">{user.email}</p>
        </div>
        <LanguageSwitcher />
        <button
          type="button"
          onClick={logout}
          className="eyebrow text-hp-pink hover:text-hp-ink transition-colors duration-150 min-h-[44px] inline-flex items-center"
        >
          {t('common.signout')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[min(280px,30vw)_minmax(0,1fr)]">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-hp-rule bg-hp-card px-4 py-3 safe-area-pad lg:hidden">
        <div className="min-w-0">
          <span className="block eyebrow text-[10px]">One Report</span>
          <p className="font-title text-lg text-hp-ink truncate">{user.fullName}</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="shrink-0 eyebrow border border-hp-rule px-3 py-2.5 min-h-[44px] min-w-[44px] text-hp-ink hover:border-hp-pink transition-colors"
          aria-expanded={menuOpen}
          aria-label={t('common.menu')}
        >
          {t('common.menu')}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-50 bg-hp-ink/30 lg:hidden"
          aria-label={t('common.close_menu')}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar: drawer on mobile, column on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[min(300px,88vw)] flex-col bg-hp-card border-r border-hp-rule shadow-lg transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-auto lg:min-h-screen lg:translate-x-0 lg:shadow-none ${
          menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-end border-b border-hp-rule px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="eyebrow px-3 py-2 min-h-[44px] text-hp-muted hover:text-hp-ink"
            aria-label={t('common.close_menu')}
          >
            {t('common.close_menu')}
          </button>
        </div>
        {sidebar}
      </aside>

      <main className="min-w-0 w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10 safe-area-pad">
        {children}
      </main>
    </div>
  );
}
