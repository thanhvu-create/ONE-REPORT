import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/_next',
  '/favicon.ico',
  '/login',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Only gate page routes — API routes handle their own auth
  if (pathname.startsWith('/api/')) return NextResponse.next();

  const token = req.cookies.get('one-report.token')?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-only-secret-do-not-use-in-prod');
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
