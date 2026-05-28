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
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '8', 10) || 8, 50);

    const reports = await prisma.report.findMany({
      where: scope,
      include: {
        user: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return ok({
      items: reports.map((r) => ({
        id: r.id,
        employee_name: r.user.fullName,
        department_name: r.department?.name ?? null,
        source_type: r.sourceType,
        ai_priority: r.aiPriority,
        has_blocker: r.hasBlocker,
        status: r.status,
        ai_summary: r.aiSummary,
        original_excerpt: (r.aiSummary ?? r.originalContent ?? r.transcript ?? '').slice(0, 140),
        created_at: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
