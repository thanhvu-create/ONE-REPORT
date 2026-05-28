import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { TaskStatus, Prisma } from '@prisma/client';

function buildBaseWhere(user: { role: string; id: number; departmentId: number | null }): Prisma.TaskWhereInput {
  if (['admin', 'supervisor', 'executive'].includes(user.role)) return {};
  if (user.role === 'leader' || user.role === 'manager') {
    return user.departmentId ? { departmentId: user.departmentId } : { userId: user.id };
  }
  return { userId: user.id };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const where = buildBaseWhere(user);

    const rows = await prisma.task.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const counts: Record<string, number> = { todo: 0, doing: 0, blocked: 0, done: 0 };
    for (const r of rows) counts[r.status] = r._count._all;

    const overdueCount = await prisma.task.count({
      where: { ...where, status: { not: TaskStatus.done }, deadline: { lt: new Date() } },
    });

    return ok({
      ...counts,
      overdue: overdueCount,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    });
  } catch (err) {
    return handleError(err);
  }
}
