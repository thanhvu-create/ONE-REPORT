import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { createPerformanceReview } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const dto = await req.json();
    if (!dto.achievements || !dto.gaps || !dto.gapReasons) {
      throw apiError(400, 'achievements, gaps, and gapReasons are required');
    }
    return ok(await createPerformanceReview(user, dto), 201);
  } catch (err) {
    return handleError(err);
  }
}
