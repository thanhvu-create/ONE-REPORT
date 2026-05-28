import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { assertCanRead } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    if (user.role === 'employee') throw apiError(403, 'Employees cannot comment on reports');
    const reportId = parseInt(params.id, 10);
    if (isNaN(reportId)) throw apiError(400, 'Invalid report id');
    const { content } = await req.json();
    if (!content?.trim()) throw apiError(400, 'content is required');
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw apiError(404, `Report ${reportId} not found`);
    assertCanRead(user, report);
    return ok(await prisma.comment.create({
      data: { reportId, userId: user.id, content },
      include: { user: { select: { id: true, fullName: true, role: true } } },
    }), 201);
  } catch (err) {
    return handleError(err);
  }
}
