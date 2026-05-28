import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { REPORT_INCLUDE } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';
import { ReportStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'supervisor') throw apiError(403, 'Only supervisors can flag reports');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid report id');
    const { note } = await req.json().catch(() => ({}));
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw apiError(404, `Report ${id} not found`);
    return ok(await prisma.report.update({
      where: { id },
      data: { isFlagged: true, flagNote: note ?? null, status: ReportStatus.flagged },
      include: REPORT_INCLUDE,
    }));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    if (!['supervisor', 'admin'].includes(user.role)) throw apiError(403, 'Only supervisors and admins can unflag reports');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid report id');
    return ok(await prisma.report.update({
      where: { id },
      data: { isFlagged: false, flagNote: null, status: ReportStatus.reviewed },
      include: REPORT_INCLUDE,
    }));
  } catch (err) {
    return handleError(err);
  }
}
