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

type UserLike = { role: string; departmentId: number | null };

function assertCanRead(user: UserLike, departmentId: number) {
  if (['admin', 'supervisor', 'executive'].includes(user.role)) return;
  if (user.departmentId === departmentId) return;
  throw apiError(403, 'You can only view positions in your own department');
}

function assertCanEdit(user: UserLike, departmentId: number) {
  if (user.role === 'admin') return;
  if ((user.role === 'leader' || user.role === 'manager') && user.departmentId === departmentId) return;
  throw apiError(403, 'Only the team leader of this department or admins can manage positions');
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');

    const position = await prisma.position.findUnique({ where: { id }, include: POSITION_INCLUDE });
    if (!position) throw apiError(404, `Position ${id} not found`);
    assertCanRead(user, position.departmentId);

    return ok(position);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');

    const position = await prisma.position.findUnique({ where: { id } });
    if (!position) throw apiError(404, `Position ${id} not found`);
    assertCanEdit(user, position.departmentId);

    const body = await req.json();
    const { title, rolePurpose, workstreams, responsibilities, expectedOutputs } = body;

    const data: Prisma.PositionUpdateInput = {};
    if (title !== undefined) data.title = String(title).trim();
    if (rolePurpose !== undefined) data.rolePurpose = rolePurpose;
    if (workstreams !== undefined) data.workstreams = workstreams as Prisma.InputJsonValue;
    if (responsibilities !== undefined) data.responsibilities = responsibilities as Prisma.InputJsonValue;
    if (expectedOutputs !== undefined) data.expectedOutputs = expectedOutputs as Prisma.InputJsonValue;

    return ok(await prisma.position.update({ where: { id }, data, include: POSITION_INCLUDE }));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');

    const position = await prisma.position.findUnique({ where: { id } });
    if (!position) throw apiError(404, `Position ${id} not found`);
    assertCanEdit(user, position.departmentId);

    await prisma.position.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
