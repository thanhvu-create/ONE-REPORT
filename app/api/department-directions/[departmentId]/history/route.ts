import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';

export async function GET(
  req: NextRequest,
  { params }: { params: { departmentId: string } },
) {
  try {
    const user = await requireAuth(req);
    const departmentId = parseInt(params.departmentId, 10);
    if (isNaN(departmentId)) throw apiError(400, 'Invalid departmentId');

    if (!['admin', 'supervisor', 'executive'].includes(user.role) && user.departmentId !== departmentId) {
      throw apiError(403, 'You can only view your own department direction');
    }

    return ok(
      await prisma.departmentDirection.findMany({
        where: { departmentId },
        include: { department: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}
