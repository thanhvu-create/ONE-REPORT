import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

function dashScope(role: string, departmentId: number | null): Prisma.ReportWhereInput {
  if (['admin', 'supervisor', 'executive'].includes(role)) return {};
  if (role === 'leader' || role === 'manager') return departmentId ? { departmentId } : { id: -1 };
  throw apiError(403, 'Only leaders and above can view the dashboard');
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const scope = dashScope(user.role, user.departmentId);

    const reports = await prisma.report.findMany({
      where: { ...scope, hasBlocker: true },
      include: {
        user: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ aiPriority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return ok(reports.map((r) => ({
      report_id: r.id,
      employee_name: r.user.fullName,
      department_name: r.department?.name ?? null,
      ai_summary: r.aiSummary,
      ai_priority: r.aiPriority,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    })));
  } catch (err) {
    return handleError(err);
  }
}
