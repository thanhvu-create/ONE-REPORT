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

    const rows = await prisma.report.findMany({
      where: { ...scope, createdAt: { gte: since } },
      select: { departmentId: true, aiPriority: true, hasBlocker: true },
    });

    type Counts = { urgent: number; high: number; medium: number; low: number; blockers: number; total: number };
    const map = new Map<number | null, Counts>();
    for (const r of rows) {
      const k = r.departmentId;
      if (!map.has(k)) map.set(k, { urgent: 0, high: 0, medium: 0, low: 0, blockers: 0, total: 0 });
      const c = map.get(k)!;
      c.total++;
      if (r.aiPriority === 'urgent') c.urgent++;
      else if (r.aiPriority === 'high') c.high++;
      else if (r.aiPriority === 'medium') c.medium++;
      else c.low++;
      if (r.hasBlocker) c.blockers++;
    }

    const deptIds = [...map.keys()].filter((id): id is number => id !== null);
    const depts = await prisma.department.findMany({ where: { id: { in: deptIds } } });
    const deptName = new Map(depts.map((d) => [d.id, d.name]));

    return ok({
      period,
      departments: [...map.entries()]
        .map(([deptId, c]) => ({ department_id: deptId, department_name: deptId !== null ? (deptName.get(deptId) ?? null) : null, ...c }))
        .sort((a, b) => b.total - a.total),
    });
  } catch (err) {
    return handleError(err);
  }
}
