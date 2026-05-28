import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/auth.types';

export type DashboardPeriod = 'today' | 'week' | 'month';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Inclusive lower bound for the period (today = midnight today, week = 7d, month = 30d). */
function periodSince(period: DashboardPeriod): Date {
  const since = startOfToday();
  if (period === 'today') return since;
  if (period === 'week') {
    since.setDate(since.getDate() - 6);
  } else if (period === 'month') {
    since.setDate(since.getDate() - 29);
  }
  return since;
}

function normalisePeriod(raw: string | undefined): DashboardPeriod {
  if (raw === 'week' || raw === 'month') return raw;
  return 'today';
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: AuthenticatedUser, rawPeriod?: string) {
    const period = normalisePeriod(rawPeriod);
    const since = periodSince(period);
    const scope = this.scope(user);

    const baseWhere: Prisma.ReportWhereInput = { ...scope, createdAt: { gte: since } };

    const [totalReports, totalBlockers, urgentReports, departments, missingReportCount] = await Promise.all([
      this.prisma.report.count({ where: baseWhere }),
      this.prisma.report.count({ where: { ...baseWhere, hasBlocker: true } }),
      this.prisma.report.count({ where: { ...baseWhere, aiPriority: 'urgent' } }),
      this.departmentSummary(user, since),
      this.missingReports(user).then((rows) => rows.length),
    ]);

    return {
      period,
      since: since.toISOString(),
      total_reports: totalReports,
      total_blockers: totalBlockers,
      urgent_reports: urgentReports,
      missing_report_count: missingReportCount,
      departments,
      generated_at: new Date().toISOString(),
    };
  }

  async trend(user: AuthenticatedUser, daysRaw?: string) {
    const days = Math.max(1, Math.min(parseInt(daysRaw ?? '14', 10) || 14, 90));
    const since = startOfToday();
    since.setDate(since.getDate() - (days - 1));
    const scope = this.scope(user);

    // Pull all reports in window, then bucket in JS — small dataset, cleaner than SQL date_trunc.
    const reports = await this.prisma.report.findMany({
      where: { ...scope, createdAt: { gte: since } },
      select: { createdAt: true, hasBlocker: true },
    });

    const buckets: Record<string, { reports: number; blockers: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      buckets[d.toISOString().slice(0, 10)] = { reports: 0, blockers: 0 };
    }
    for (const r of reports) {
      const key = new Date(r.createdAt).toISOString().slice(0, 10);
      const bucket = buckets[key];
      if (bucket) {
        bucket.reports += 1;
        if (r.hasBlocker) bucket.blockers += 1;
      }
    }

    return {
      since: since.toISOString(),
      days,
      buckets: Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, reports: v.reports, blockers: v.blockers })),
    };
  }

  async priorityDistribution(user: AuthenticatedUser, rawPeriod?: string) {
    const period = normalisePeriod(rawPeriod);
    const since = periodSince(period);
    const scope = this.scope(user);

    const grouped = await this.prisma.report.groupBy({
      by: ['aiPriority'],
      where: { ...scope, createdAt: { gte: since } },
      _count: { _all: true },
    });

    const buckets = [
      { priority: 'low', count: 0 },
      { priority: 'medium', count: 0 },
      { priority: 'high', count: 0 },
      { priority: 'urgent', count: 0 },
    ];
    let total = 0;
    for (const g of grouped) {
      const key = g.aiPriority ?? 'medium';
      const target = buckets.find((b) => b.priority === key);
      if (target) target.count += g._count._all;
      total += g._count._all;
    }
    return { period, total, buckets };
  }

  async issueCategories(user: AuthenticatedUser, rawPeriod?: string, limit = 8) {
    const period = normalisePeriod(rawPeriod);
    const since = periodSince(period);
    const scope = this.scope(user);

    const grouped = await this.prisma.report.groupBy({
      by: ['issueCategory'],
      where: { ...scope, createdAt: { gte: since }, hasBlocker: true },
      _count: { _all: true },
      orderBy: { _count: { issueCategory: 'desc' } },
      take: limit,
    });

    const totalWithIssues = grouped.reduce((s, g) => s + g._count._all, 0);
    return {
      period,
      total_with_issues: totalWithIssues,
      buckets: grouped.map((g) => ({ category: g.issueCategory ?? 'other', count: g._count._all })),
    };
  }

  async topContributors(user: AuthenticatedUser, rawPeriod?: string, limitRaw?: string) {
    const period = normalisePeriod(rawPeriod);
    const since = periodSince(period);
    const limit = Math.max(1, Math.min(parseInt(limitRaw ?? '5', 10) || 5, 20));
    const scope = this.scope(user);

    const grouped = await this.prisma.report.groupBy({
      by: ['userId'],
      where: { ...scope, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: limit,
    });

    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { department: { select: { id: true, name: true } } },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return {
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
    };
  }

  async recent(user: AuthenticatedUser, limitRaw?: string) {
    const limit = Math.max(1, Math.min(parseInt(limitRaw ?? '8', 10) || 8, 50));
    const scope = this.scope(user);

    const reports = await this.prisma.report.findMany({
      where: scope,
      include: {
        user: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      items: reports.map((r) => ({
        id: r.id,
        employee_name: r.user.fullName,
        department_name: r.department?.name ?? null,
        source_type: r.sourceType,
        ai_priority: r.aiPriority,
        has_blocker: r.hasBlocker,
        issue_category: r.issueCategory,
        status: r.status,
        ai_summary: r.aiSummary,
        original_excerpt: (r.aiSummary ?? r.originalContent ?? r.transcript ?? '').slice(0, 140),
        created_at: r.createdAt.toISOString(),
      })),
    };
  }

  async issues(user: AuthenticatedUser) {
    const scope = this.scope(user);
    const reports = await this.prisma.report.findMany({
      where: { ...scope, hasBlocker: true },
      include: {
        user: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ aiPriority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return reports.map((r) => ({
      report_id: r.id,
      employee_name: r.user.fullName,
      department_name: r.department?.name ?? null,
      ai_summary: r.aiSummary,
      ai_priority: r.aiPriority,
      issue_category: r.issueCategory,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));
  }

  async missingReports(user: AuthenticatedUser) {
    if (user.role === 'employee') {
      throw new ForbiddenException('Only leaders and above can view missing-reports');
    }
    const today = startOfToday();
    const userWhere: Prisma.UserWhereInput = { isActive: true, role: { in: ['employee', 'leader'] } };
    if (user.role === 'leader') {
      if (!user.departmentId) return [];
      userWhere.departmentId = user.departmentId;
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { fullName: 'asc' },
    });

    const submitted = await this.prisma.report.findMany({
      where: { createdAt: { gte: today }, userId: { in: users.map((u) => u.id) } },
      select: { userId: true },
    });
    const submittedSet = new Set(submitted.map((r) => r.userId));

    return users
      .filter((u) => !submittedSet.has(u.id))
      .map((u) => ({
        user_id: u.id,
        full_name: u.fullName,
        email: u.email,
        department_id: u.departmentId,
        department_name: u.department?.name ?? null,
      }));
  }

  async deptHeatmap(user: AuthenticatedUser, rawPeriod?: string) {
    const period = normalisePeriod(rawPeriod);
    const since = periodSince(period);
    const scope = this.scope(user);
    const where: Prisma.ReportWhereInput = { ...scope, createdAt: { gte: since } };

    // Fetch all reports in window with dept + priority
    const rows = await this.prisma.report.findMany({
      where,
      select: { departmentId: true, aiPriority: true, hasBlocker: true },
    });

    // Aggregate in JS: map dept → {urgent,high,medium,low,blockers}
    type Counts = { urgent: number; high: number; medium: number; low: number; blockers: number; total: number };
    const map = new Map<number | null, Counts>();
    for (const r of rows) {
      const key = r.departmentId;
      if (!map.has(key)) map.set(key, { urgent: 0, high: 0, medium: 0, low: 0, blockers: 0, total: 0 });
      const c = map.get(key)!;
      c.total += 1;
      if (r.aiPriority === 'urgent') c.urgent += 1;
      else if (r.aiPriority === 'high') c.high += 1;
      else if (r.aiPriority === 'medium') c.medium += 1;
      else c.low += 1;
      if (r.hasBlocker) c.blockers += 1;
    }

    const deptIds = [...map.keys()].filter((id): id is number => id !== null);
    const depts = await this.prisma.department.findMany({ where: { id: { in: deptIds } } });
    const deptName = new Map(depts.map((d) => [d.id, d.name]));

    const departments = [...map.entries()]
      .map(([deptId, c]) => ({
        department_id: deptId,
        department_name: deptId !== null ? (deptName.get(deptId) ?? null) : null,
        ...c,
      }))
      .sort((a, b) => b.total - a.total);

    return { period, departments };
  }

  async directionAdjustments(user: AuthenticatedUser, limitRaw?: string) {
    const limit = Math.min(parseInt(limitRaw ?? '20', 10) || 20, 50);
    const scope = this.scope(user);

    const items = await this.prisma.report.findMany({
      where: {
        ...scope,
        reportType: 'performance_review',
        needsDirectionAdjustment: true,
        status: { not: 'resolved' },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return items.map((r) => ({
      report_id: r.id,
      employee_name: r.user.fullName,
      department_name: r.department?.name ?? null,
      review_period: r.reviewPeriod,
      adjustment_details: (r.performanceData as any)?.directionAdjustmentDetails ?? null,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    }));
  }

  private scope(user: AuthenticatedUser): Prisma.ReportWhereInput {
    // Wide readers see everything
    if (['admin', 'supervisor', 'executive'].includes(user.role)) return {};
    // Leader sees own department
    if (user.role === 'leader') {
      return user.departmentId ? { departmentId: user.departmentId } : { id: -1 };
    }
    throw new ForbiddenException('Only leaders and above can view the dashboard');
  }

  private async departmentSummary(user: AuthenticatedUser, since: Date) {
    const where: Prisma.ReportWhereInput = { createdAt: { gte: since } };
    if (user.role === 'leader') {
      where.departmentId = user.departmentId ?? -1;
    }
    const grouped = await this.prisma.report.groupBy({
      by: ['departmentId'],
      where,
      _count: { _all: true },
    });
    const blocker = await this.prisma.report.groupBy({
      by: ['departmentId'],
      where: { ...where, hasBlocker: true },
      _count: { _all: true },
    });
    const blockerMap = new Map(blocker.map((b) => [b.departmentId, b._count._all]));

    const deptIds = grouped.map((g) => g.departmentId).filter((id): id is number => id !== null);
    const depts = await this.prisma.department.findMany({ where: { id: { in: deptIds } } });
    const deptMap = new Map(depts.map((d) => [d.id, d.name]));

    return grouped.map((g) => ({
      department_id: g.departmentId,
      department_name: g.departmentId !== null ? (deptMap.get(g.departmentId) ?? null) : null,
      report_count: g._count._all,
      blocker_count: blockerMap.get(g.departmentId) ?? 0,
    }));
  }
}
