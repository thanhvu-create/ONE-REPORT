import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

const POSITION_INCLUDE = {
  department: { select: { id: true, name: true } },
  kpis: { orderBy: { createdAt: 'asc' as const } },
  _count: { select: { users: true } },
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const deptIdParam = searchParams.get('departmentId');

    const where: Prisma.PositionWhereInput = {};
    if (['admin', 'supervisor', 'executive'].includes(user.role)) {
      if (deptIdParam) where.departmentId = parseInt(deptIdParam, 10);
    } else {
      if (!user.departmentId) return ok([]);
      where.departmentId = user.departmentId;
    }

    return ok(
      await prisma.position.findMany({
        where,
        include: POSITION_INCLUDE,
        orderBy: [{ departmentId: 'asc' }, { title: 'asc' }],
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { departmentId, title, rolePurpose, workstreams, responsibilities, expectedOutputs } = body;

    if (!departmentId || !title?.trim()) throw apiError(400, 'departmentId and title are required');

    if (user.role !== 'admin') {
      if (!['leader', 'manager'].includes(user.role) || user.departmentId !== departmentId) {
        throw apiError(403, 'Only the team leader of this department or admins can manage positions');
      }
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw apiError(404, `Department ${departmentId} not found`);

    return ok(
      await prisma.position.create({
        data: {
          departmentId,
          title: String(title).trim(),
          rolePurpose: rolePurpose ?? null,
          workstreams: (workstreams ?? []) as Prisma.InputJsonValue,
          responsibilities: (responsibilities ?? []) as Prisma.InputJsonValue,
          expectedOutputs: (expectedOutputs ?? []) as Prisma.InputJsonValue,
        },
        include: POSITION_INCLUDE,
      }),
      201,
    );
  } catch (err) {
    return handleError(err);
  }
}
