import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

type Period = 'today' | 'week' | 'month';

function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

function periodSince(period: Period): Date {
  const d = startOfToday();
  if (period === 'week') d.setDate(d.getDate() - 6);
  else if (period === 'month') d.setDate(d.getDate() - 29);
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
    const period = (req.nextUrl.searchParams.get('period') as Period | null) ?? 'today';
    const since = periodSince(['today', 'week', 'month'].includes(period) ? period : 'today');
    const scope = dashScope(user.role, user.departmentId);
    const base: Prisma.ReportWhereInput = { ...scope, createdAt: { gte: since } };

    const [totalReports, totalBlockers, urgentReports] = await Promise.all([
      prisma.report.count({ where: base }),
      prisma.report.count({ where: { ...base, hasBlocker: true } }),
      prisma.report.count({ where: { ...base, aiPriority: 'urgent' } }),
    ]);

    // Missing reports (users who haven't submitted today)
    const today = startOfToday();
    const userWhere: Prisma.UserWhereInput = { isActive: true, role: { in: ['employee', 'leader', 'manager'] as any } };
    if ((user.role === 'leader' || user.role === 'manager') && user.departmentId) userWhere.departmentId = user.departmentId;
    const [activeUsers, todayReports] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.report.count({ where: { ...scope, createdAt: { gte: today } } }),
    ]);

    return ok({
      period,
      since: since.toISOString(),
      total_reports: totalReports,
      total_blockers: totalBlockers,
      urgent_reports: urgentReports,
      missing_report_count: Math.max(0, activeUsers - todayReports),
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}
