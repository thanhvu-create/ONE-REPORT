import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { createStatusReport } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const dto = await req.json();
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw apiError(400, 'items array is required');
    }
    return ok(await createStatusReport(user, dto), 201);
  } catch (err) {
    return handleError(err);
  }
}
