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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') throw apiError(403, 'Admin only');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid user id');
    const found = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!found) throw apiError(404, `User ${id} not found`);
    return ok(found);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    if (user.role !== 'admin') throw apiError(403, 'Admin only');
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid user id');
    const found = await prisma.user.findUnique({ where: { id } });
    if (!found) throw apiError(404, `User ${id} not found`);
    const dto = await req.json();
    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = String(dto.email).toLowerCase();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.departmentId !== undefined) {
      if (dto.departmentId !== null) {
        const dept = await prisma.department.findUnique({ where: { id: dto.departmentId } });
        if (!dept) throw apiError(404, `Department ${dto.departmentId} not found`);
      }
      data.departmentId = dto.departmentId;
    }
    if (dto.positionId !== undefined) data.positionId = dto.positionId;
    if (dto.password) data.passwordHash = await bcrypt.hash(String(dto.password), 10);
    return ok(await prisma.user.update({ where: { id }, data, select: USER_SELECT }));
  } catch (err) {
    return handleError(err);
  }
}
