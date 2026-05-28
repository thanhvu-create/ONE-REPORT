import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role === 'employee') throw apiError(403, 'Only leaders and above can view missing-reports');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const userWhere: Prisma.UserWhereInput = { isActive: true, role: { in: ['employee', 'leader', 'manager'] as any } };
    if (user.role === 'leader' || user.role === 'manager') {
      if (!user.departmentId) return ok([]);
      userWhere.departmentId = user.departmentId;
    }

    const [users, submitted] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        include: { department: { select: { id: true, name: true } } },
        orderBy: { fullName: 'asc' },
      }),
      prisma.report.findMany({
        where: { createdAt: { gte: today } },
        select: { userId: true },
      }),
    ]);

    const submittedSet = new Set(submitted.map((r) => r.userId));
    return ok(
      users.filter((u) => !submittedSet.has(u.id)).map((u) => ({
        user_id: u.id,
        full_name: u.fullName,
        email: u.email,
        department_id: u.departmentId,
        department_name: u.department?.name ?? null,
      })),
    );
  } catch (err) {
    return handleError(err);
  }
}
