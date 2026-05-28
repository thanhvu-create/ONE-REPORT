import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { ok, handleError } from '@/lib/server/route';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return ok(user);
  } catch (err) {
    return handleError(err);
  }
}
