import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

type Period = 'today' | 'week' | 'month';

function periodSince(period: Period): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0);
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
    const validPeriod = (['today', 'week', 'month'] as const).includes(period as Period)
      ? (period as Period)
      : 'today';
    const since = periodSince(validPeriod);
    const scope = dashScope(user.role, user.departmentId);
    const base: Prisma.ReportWhereInput = { ...scope, createdAt: { gte: since } };

    const [technical, waitingTeam, resourceNeeded, directionAdj, totalWithIssues] = await Promise.all([
      // Blocker, no external support needed → technical / process issue
      prisma.report.count({ where: { ...base, hasBlocker: true, needsSupport: false } }),
      // Blocker + needs support → waiting on internal team
      prisma.report.count({ where: { ...base, hasBlocker: true, needsSupport: true } }),
      // Needs support but no hard blocker → resource needed
      prisma.report.count({ where: { ...base, hasBlocker: false, needsSupport: true } }),
      // Needs direction adjustment only (no blocker / support flag)
      prisma.report.count({ where: { ...base, needsDirectionAdjustment: true, hasBlocker: false, needsSupport: false } }),
      // Any report with at least one issue flag
      prisma.report.count({
        where: { ...base, OR: [{ hasBlocker: true }, { needsSupport: true }, { needsDirectionAdjustment: true }] },
      }),
    ]);

    const buckets = [
      { category: 'technical_issue', count: technical },
      { category: 'waiting_internal_team', count: waitingTeam },
      { category: 'resource_needed', count: resourceNeeded },
      { category: 'other', count: directionAdj },
    ].filter((b) => b.count > 0);

    return ok({ period: validPeriod, total_with_issues: totalWithIssues, buckets });
  } catch (err) {
    return handleError(err);
  }
}
