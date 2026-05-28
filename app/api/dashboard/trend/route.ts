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
    const days = Math.max(1, Math.min(parseInt(req.nextUrl.searchParams.get('days') ?? '14', 10) || 14, 90));
    const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));

    const reports = await prisma.report.findMany({
      where: { ...scope, createdAt: { gte: since } },
      select: { createdAt: true, hasBlocker: true },
    });

    const buckets: Record<string, { reports: number; blockers: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since); d.setDate(d.getDate() + i);
      buckets[d.toISOString().slice(0, 10)] = { reports: 0, blockers: 0 };
    }
    for (const r of reports) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      if (buckets[key]) { buckets[key].reports++; if (r.hasBlocker) buckets[key].blockers++; }
    }

    return ok({
      since: since.toISOString(), days,
      buckets: Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, reports: v.reports, blockers: v.blockers })),
    });
  } catch (err) {
    return handleError(err);
  }
}
