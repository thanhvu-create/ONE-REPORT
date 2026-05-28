import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { REPORT_INCLUDE, assertCanRead } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid report id');
    const report = await prisma.report.findUnique({ where: { id }, include: REPORT_INCLUDE });
    if (!report) throw apiError(404, `Report ${id} not found`);
    assertCanRead(user, report);
    return ok(report);
  } catch (err) {
    return handleError(err);
  }
}
