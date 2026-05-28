import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

type Period = 'today' | 'week' | 'month';
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function periodSince(p: Period): Date {
  const d = startOfToday();
  if (p === 'week') d.setDate(d.getDate() - 6);
  else if (p === 'month') d.setDate(d.getDate() - 29);
  return d;
}
function dashScope(role: string, departmentId: number | null): Prisma.ReportWhereInput {
  if (['admin', 'supervisor', 'executive'].includes(role)) return {};
  if (role === 'leader' || role === 'manager') return departmentId ? { departmentId } : { id: -1 };
  throw apiError(403, 'Only leaders and above can view the dashboard');
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const sp = req.nextUrl.searchParams;
    const period = (sp.get('period') as Period) ?? 'today';
    const since = periodSince(['today', 'week', 'month'].includes(period) ? period : 'today');
    const limit = Math.max(1, Math.min(parseInt(sp.get('limit') ?? '5', 10) || 5, 20));
    const scope = dashScope(user.role, user.departmentId);

    const grouped = await prisma.report.groupBy({
      by: ['userId'],
      where: { ...scope, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: limit,
    });

    const userIds = grouped.map((g) => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { department: { select: { id: true, name: true } } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return ok({
      period,
      contributors: grouped.map((g) => {
        const u = byId.get(g.userId);
        return {
          user_id: g.userId,
          full_name: u?.fullName ?? `User #${g.userId}`,
          email: u?.email ?? null,
          department_name: u?.department?.name ?? null,
          report_count: g._count._all,
        };
      }),
    });
  } catch (err) {
    return handleError(err);
  }
}
