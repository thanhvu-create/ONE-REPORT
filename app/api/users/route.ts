import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import bcrypt from 'bcryptjs';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

const USER_SELECT = {
  id: true, fullName: true, email: true, role: true,
  departmentId: true, positionId: true, isActive: true,
  createdAt: true, updatedAt: true,
  department: { select: { id: true, name: true } },
  position: { select: { id: true, title: true } },
} satisfies Prisma.UserSelect;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') throw apiError(403, 'Admin only');
    return ok(await prisma.user.findMany({ orderBy: [{ role: 'asc' }, { fullName: 'asc' }], select: USER_SELECT }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') throw apiError(403, 'Admin only');
    const dto = await req.json();
    const email = String(dto.email).toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw apiError(409, 'Email already in use');
    if (dto.departmentId !== undefined) {
      const dept = await prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw apiError(404, `Department ${dto.departmentId} not found`);
    }
    const passwordHash = await bcrypt.hash(String(dto.password), 10);
    return ok(await prisma.user.create({
      data: {
        email, fullName: dto.fullName, passwordHash, role: dto.role,
        departmentId: dto.departmentId ?? null,
        positionId: dto.positionId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: USER_SELECT,
    }), 201);
  } catch (err) {
    return handleError(err);
  }
}
