'use client';

import { getStoredToken, clearAuth } from './auth';

const BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public errorCode?: string, public payload?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (init?.auth !== false) {
    const token = getStoredToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new ApiError(
      0,
      'Cannot reach the server. Make sure the app is running.',
    );
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError(res.status, text.slice(0, 200) || `Request failed with ${res.status}`);
    }
  }

  if (!res.ok) {
    if (res.status === 401 && init?.auth !== false) {
      clearAuth();
    }
    const body = json as { message?: string | string[]; errorCode?: string } | null;
    const message =
      typeof body?.message === 'string'
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join('; ')
          : `Request failed with ${res.status}`;
    throw new ApiError(res.status, message, body?.errorCode, json);
  }
  return json as T;
}

export const api = {
  get<T>(path: string, opts?: RequestInit & { auth?: boolean }) {
    return request<T>(path, { ...opts, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, opts?: RequestInit & { auth?: boolean }) {
    return request<T>(path, {
      ...opts,
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put<T>(path: string, body?: unknown, opts?: RequestInit & { auth?: boolean }) {
    return request<T>(path, { ...opts, method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined });
  },
  patch<T>(path: string, body?: unknown, opts?: RequestInit & { auth?: boolean }) {
    return request<T>(path, { ...opts, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined });
  },
  delete<T>(path: string, opts?: RequestInit & { auth?: boolean }) {
    return request<T>(path, { ...opts, method: 'DELETE' });
  },
};

export const swrFetcher = <T>(path: string) => api.get<T>(path);
