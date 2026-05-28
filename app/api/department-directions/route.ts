import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (['admin', 'supervisor', 'executive'].includes(user.role)) {
      return ok(
        await prisma.departmentDirection.findMany({
          where: { isCurrent: true },
          include: { department: { select: { id: true, name: true } } },
          orderBy: { department: { name: 'asc' } },
        }),
      );
    }

    if (!user.departmentId) return ok([]);

    return ok(
      await prisma.departmentDirection.findMany({
        where: { departmentId: user.departmentId, isCurrent: true },
        include: { department: { select: { id: true, name: true } } },
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}
