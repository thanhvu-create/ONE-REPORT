import { NextResponse } from 'next/server';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleError(err: unknown): NextResponse {
  const e = err as { status?: number; message?: string };
  if (e?.status && e.status >= 400 && e.status < 600) {
    return NextResponse.json({ message: e.message ?? 'Error' }, { status: e.status });
  }
  console.error('[API error]', err);
  return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
}
