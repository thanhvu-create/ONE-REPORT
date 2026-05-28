import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  departmentId: number | null;
  fullName: string;
}

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'dev-only-secret-do-not-use-in-prod',
  );
}

export async function signToken(payload: Omit<AuthUser, 'fullName'> & { fullName: string }): Promise<string> {
  return new SignJWT({
    sub: String(payload.id),
    email: payload.email,
    role: payload.role,
    departmentId: payload.departmentId,
    fullName: payload.fullName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '24h')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getSecret());
  return {
    id: Number(payload.sub),
    email: payload.email as string,
    role: payload.role as string,
    departmentId: (payload.departmentId as number | null) ?? null,
    fullName: (payload.fullName as string) ?? '',
  };
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    throw apiError(401, 'Unauthorized');
  }
  try {
    return await verifyToken(header.slice(7));
  } catch {
    throw apiError(401, 'Invalid or expired token');
  }
}

export function apiError(status: number, message: string): { status: number; message: string } {
  return { status, message };
}
