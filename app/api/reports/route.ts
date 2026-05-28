import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { listReports, ListQuery } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const sp = req.nextUrl.searchParams;
    const query: ListQuery = {
      reportType: sp.get('reportType') ?? undefined,
      departmentId: sp.get('departmentId') ?? undefined,
      userId: sp.get('userId') ?? undefined,
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
      priority: sp.get('priority') ?? undefined,
      hasBlocker: sp.get('hasBlocker') ?? undefined,
      needsDirectionAdjustment: sp.get('needsDirectionAdjustment') ?? undefined,
      status: sp.get('status') ?? undefined,
      limit: sp.get('limit') ?? undefined,
      offset: sp.get('offset') ?? undefined,
    };
    return ok(await listReports(user, query));
  } catch (err) {
    return handleError(err);
  }
}
