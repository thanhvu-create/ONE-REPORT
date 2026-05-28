import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');
    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) throw apiError(404, `Department ${id} not found`);
    return ok(dept);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') throw apiError(403, 'Admin only');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw apiError(404, `Department ${id} not found`);
    const { name, description } = await req.json();
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    try {
      return ok(await prisma.department.update({ where: { id }, data }));
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
        throw apiError(409, 'A department with that name already exists');
      }
      throw err;
    }
  } catch (err) {
    return handleError(err);
  }
}
