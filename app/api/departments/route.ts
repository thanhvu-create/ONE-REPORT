import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    return ok(await prisma.department.findMany({ orderBy: { name: 'asc' } }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') throw apiError(403, 'Admin only');
    const { name, description } = await req.json();
    if (!name?.trim()) throw apiError(400, 'name is required');
    try {
      return ok(await prisma.department.create({ data: { name, description: description ?? null } }), 201);
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
