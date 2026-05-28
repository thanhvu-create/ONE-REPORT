import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { REPORT_INCLUDE } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';
import { ReportStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    if (user.role === 'employee') throw apiError(403, 'Employees cannot change report status');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid report id');
    const { status, note } = await req.json();
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw apiError(404, `Report ${id} not found`);
    if ((user.role === 'leader' || user.role === 'manager') && report.departmentId !== user.departmentId) {
      throw apiError(403, 'Leaders may only update reports in their department');
    }
    const extra: Record<string, unknown> = {};
    if (status === 'resolved') {
      extra.resolvedAt = new Date();
      extra.resolvedById = user.id;
      if (note) extra.resolvedNote = note;
    }
    return ok(await prisma.report.update({
      where: { id },
      data: { status: status as ReportStatus, ...extra },
      include: REPORT_INCLUDE,
    }));
  } catch (err) {
    return handleError(err);
  }
}
