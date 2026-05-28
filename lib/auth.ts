'use client';

import { AuthenticatedUser } from './types';

const TOKEN_KEY = 'one-report.token';
const USER_KEY = 'one-report.user';

export function saveAuth(token: string, user: AuthenticatedUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthenticatedUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function rolePath(role: AuthenticatedUser['role']): string {
  switch (role) {
    case 'admin':
      return '/admin/users';
    case 'executive':
      return '/executive/dashboard';
    case 'supervisor':
      return '/supervisor/dashboard';
    case 'leader':
      return '/leader/dashboard';
    case 'employee':
    default:
      return '/submit/status-report';
  }
}

export function canSubmitReports(role: AuthenticatedUser['role']): boolean {
  return role === 'employee' || role === 'leader';
}

export function canViewAllDepts(role: AuthenticatedUser['role']): boolean {
  return role === 'supervisor' || role === 'executive' || role === 'admin';
}

export function canComment(role: AuthenticatedUser['role']): boolean {
  return role !== 'employee';
}

export function canFlag(role: AuthenticatedUser['role']): boolean {
  return role === 'supervisor';
}
