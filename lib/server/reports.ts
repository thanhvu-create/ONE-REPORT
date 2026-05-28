import { Prisma, ReportStatus, ReportType, ReviewPeriod, SourceType } from '@prisma/client';
import { prisma } from './prisma';
import { AuthUser, apiError } from './auth';

export const REPORT_INCLUDE = {
  user: { select: { id: true, fullName: true, email: true, role: true } },
  department: { select: { id: true, name: true } },
  voiceRecord: { select: { id: true, fileName: true, mimeType: true, durationSeconds: true, transcript: true } },
  comments: {
    include: { user: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ReportInclude;

const SUBMITTER_ROLES = ['employee', 'leader', 'manager'];
const WIDE_READER_ROLES = ['supervisor', 'executive'];
const DEPT_READER_ROLES = ['leader', 'manager'];

export function assertCanSubmit(user: AuthUser) {
  if (!SUBMITTER_ROLES.includes(user.role)) {
    throw apiError(403, `Role '${user.role}' cannot submit reports`);
  }
}

export function scopedWhere(user: AuthUser): Prisma.ReportWhereInput {
  if (WIDE_READER_ROLES.includes(user.role)) return {};
  if (user.role === 'admin') return {};
  if (DEPT_READER_ROLES.includes(user.role)) {
    return user.departmentId ? { departmentId: user.departmentId } : { id: -1 };
  }
  return { userId: user.id };
}

export function assertCanRead(user: AuthUser, report: { userId: number; departmentId: number | null }) {
  if (WIDE_READER_ROLES.includes(user.role) || user.role === 'admin') return;
  if (DEPT_READER_ROLES.includes(user.role)) {
    if (report.departmentId === user.departmentId) return;
    throw apiError(403, 'Report not in your department');
  }
  if (report.userId === user.id) return;
  throw apiError(403, 'You can only view your own reports');
}

export async function resolveDepartmentId(user: AuthUser, requested?: number): Promise<number | null> {
  if (requested !== undefined) {
    const dept = await prisma.department.findUnique({ where: { id: requested } });
    if (!dept) throw apiError(404, `Department ${requested} not found`);
    if (user.role === 'employee' && user.departmentId && requested !== user.departmentId) {
      throw apiError(403, 'Employees can only file reports under their own department');
    }
    return requested;
  }
  return user.departmentId ?? null;
}

export function topPriorityFromItems(items: Array<{ priority: string }>): 'low' | 'medium' | 'high' | 'urgent' {
  const order: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  const top = items.reduce((best, item) => {
    const val = order[item.priority] ?? 2;
    return val > (order[best] ?? 2) ? item.priority : best;
  }, 'low');
  return top as 'low' | 'medium' | 'high' | 'urgent';
}

export interface ListQuery {
  reportType?: string;
  departmentId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
  hasBlocker?: string;
  needsDirectionAdjustment?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

export async function listReports(user: AuthUser, q: ListQuery) {
  const where: Prisma.ReportWhereInput = scopedWhere(user);

  if (q.reportType) where.reportType = q.reportType as ReportType;
  if (q.departmentId !== undefined) {
    const deptId = parseInt(q.departmentId, 10);
    if (user.role === 'leader' && deptId !== user.departmentId) throw apiError(403, 'Leaders can only view reports in their own department');
    where.departmentId = deptId;
  }
  if (q.userId !== undefined) {
    const uid = parseInt(q.userId, 10);
    if (user.role === 'employee' && uid !== user.id) throw apiError(403, 'Employees can only view their own reports');
    where.userId = uid;
  }
  if (q.priority) where.aiPriority = q.priority as Prisma.EnumPriorityFilter;
  if (q.status) where.status = q.status as ReportStatus;
  if (q.hasBlocker !== undefined) where.hasBlocker = q.hasBlocker === 'true';
  if (q.needsDirectionAdjustment !== undefined) where.needsDirectionAdjustment = q.needsDirectionAdjustment === 'true';
  if (q.dateFrom || q.dateTo) {
    where.createdAt = {};
    if (q.dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(q.dateFrom);
    if (q.dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(q.dateTo);
  }

  const limit = Math.min(parseInt(q.limit ?? '50', 10) || 50, 200);
  const offset = parseInt(q.offset ?? '0', 10) || 0;

  const [items, total] = await Promise.all([
    prisma.report.findMany({ where, include: REPORT_INCLUDE, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
    prisma.report.count({ where }),
  ]);
  return { items, total, limit, offset };
}

export async function createStatusReport(user: AuthUser, dto: {
  items: Array<{ name: string; currentStatus: string; nextSteps: string; deadline?: string | null; proposal?: string; needsSupport: boolean; priority: string; hasBlocker: boolean }>;
  departmentId?: number;
}) {
  assertCanSubmit(user);
  const departmentId = await resolveDepartmentId(user, dto.departmentId);
  const hasBlocker = dto.items.some((i) => i.hasBlocker);
  const needsSupport = dto.items.some((i) => i.needsSupport);
  const aiPriority = topPriorityFromItems(dto.items);
  return prisma.report.create({
    data: {
      userId: user.id, departmentId,
      reportType: ReportType.status_report,
      sourceType: SourceType.text,
      statusItems: dto.items as unknown as Prisma.InputJsonValue,
      hasBlocker, needsSupport, aiPriority,
    },
    include: REPORT_INCLUDE,
  });
}

export async function createPerformanceReview(user: AuthUser, dto: {
  achievements: string; achievedKpis: string; gaps: string; gapReasons: string;
  opportunities?: string; needsDirectionAdjustment: boolean; directionAdjustmentDetails?: string;
  reviewPeriod: string; needsSupport: boolean; departmentId?: number;
}) {
  assertCanSubmit(user);
  const departmentId = await resolveDepartmentId(user, dto.departmentId);
  const performanceData = {
    achievements: dto.achievements, achievedKpis: dto.achievedKpis,
    gaps: dto.gaps, gapReasons: dto.gapReasons,
    opportunities: dto.opportunities ?? '',
    needsDirectionAdjustment: dto.needsDirectionAdjustment,
    directionAdjustmentDetails: dto.directionAdjustmentDetails ?? '',
  };
  return prisma.report.create({
    data: {
      userId: user.id, departmentId,
      reportType: ReportType.performance_review,
      sourceType: SourceType.text,
      performanceData: performanceData as unknown as Prisma.InputJsonValue,
      reviewPeriod: dto.reviewPeriod as ReviewPeriod,
      needsSupport: dto.needsSupport,
      needsDirectionAdjustment: dto.needsDirectionAdjustment,
    },
    include: REPORT_INCLUDE,
  });
}

export async function createVoiceStatusReport(user: AuthUser, items: any[], transcript: string, departmentId: number | null, storageKey: string, fileName: string, mimeType: string) {
  const hasBlocker = items.some((i: any) => i.hasBlocker);
  const needsSupport = items.some((i: any) => i.needsSupport);
  const aiPriority = topPriorityFromItems(items);
  return prisma.report.create({
    data: {
      userId: user.id, departmentId,
      reportType: ReportType.status_report, sourceType: SourceType.voice,
      transcript, statusItems: items as unknown as Prisma.InputJsonValue,
      hasBlocker, needsSupport, aiPriority,
      voiceRecord: { create: { filePath: storageKey, fileName, mimeType, transcript } },
    },
    include: REPORT_INCLUDE,
  });
}

export async function createVoicePerformanceReview(user: AuthUser, parsed: Record<string, unknown>, transcript: string, reviewPeriod: string, departmentId: number | null, storageKey: string, fileName: string, mimeType: string) {
  const needsAdjustment = Boolean((parsed as any).needsDirectionAdjustment);
  return prisma.report.create({
    data: {
      userId: user.id, departmentId,
      reportType: ReportType.performance_review, sourceType: SourceType.voice,
      transcript, performanceData: parsed as unknown as Prisma.InputJsonValue,
      reviewPeriod: (reviewPeriod as ReviewPeriod) ?? ReviewPeriod.weekly,
      needsDirectionAdjustment: needsAdjustment,
      voiceRecord: { create: { filePath: storageKey, fileName, mimeType, transcript } },
    },
    include: REPORT_INCLUDE,
  });
}

export async function createFromTaskTracker(user: AuthUser, rawText: string, items: any[], departmentId: number | null) {
  const hasBlocker = items.some((i: any) => i.hasBlocker);
  const needsSupport = items.some((i: any) => i.needsSupport);
  const aiPriority = topPriorityFromItems(items);
  return prisma.report.create({
    data: {
      userId: user.id, departmentId,
      reportType: ReportType.status_report, sourceType: SourceType.task_tracker,
      originalContent: rawText.slice(0, 5000),
      statusItems: items as unknown as Prisma.InputJsonValue,
      hasBlocker, needsSupport, aiPriority,
    },
    include: REPORT_INCLUDE,
  });
}
