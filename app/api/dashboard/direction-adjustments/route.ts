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
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20, 50);
    const scope = dashScope(user.role, user.departmentId);

    const items = await prisma.report.findMany({
      where: { ...scope, reportType: 'performance_review', needsDirectionAdjustment: true, status: { not: 'resolved' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return ok(items.map((r) => ({
      report_id: r.id,
      employee_name: r.user.fullName,
      department_name: r.department?.name ?? null,
      review_period: r.reviewPeriod,
      adjustment_details: (r.performanceData as any)?.directionAdjustmentDetails ?? null,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    })));
  } catch (err) {
    return handleError(err);
  }
}
