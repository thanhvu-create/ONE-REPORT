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
    const period = (req.nextUrl.searchParams.get('period') as Period) ?? 'today';
    const since = periodSince(['today', 'week', 'month'].includes(period) ? period : 'today');
    const scope = dashScope(user.role, user.departmentId);

    const grouped = await prisma.report.groupBy({
      by: ['aiPriority'],
      where: { ...scope, createdAt: { gte: since } },
      _count: { _all: true },
    });

    const buckets = [
      { priority: 'low', count: 0 }, { priority: 'medium', count: 0 },
      { priority: 'high', count: 0 }, { priority: 'urgent', count: 0 },
    ];
    let total = 0;
    for (const g of grouped) {
      const key = g.aiPriority ?? 'medium';
      const t = buckets.find((b) => b.priority === key);
      if (t) t.count += g._count._all;
      total += g._count._all;
    }
    return ok({ period, total, buckets });
  } catch (err) {
    return handleError(err);
  }
}
