import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { Prisma } from '@prisma/client';

type UserLike = { role: string; departmentId: number | null; id: number };

function assertCanRead(user: UserLike, departmentId: number) {
  if (['admin', 'supervisor', 'executive'].includes(user.role)) return;
  if (user.departmentId === departmentId) return;
  throw apiError(403, 'You can only view your own department direction');
}

function assertCanEdit(user: UserLike, departmentId: number) {
  if (user.role === 'admin') return;
  if ((user.role === 'leader' || user.role === 'manager') && user.departmentId === departmentId) return;
  throw apiError(403, 'Only the team leader of this department or admins can edit direction');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { departmentId: string } },
) {
  try {
    const user = await requireAuth(req);
    const departmentId = parseInt(params.departmentId, 10);
    if (isNaN(departmentId)) throw apiError(400, 'Invalid departmentId');

    assertCanRead(user, departmentId);

    return ok(
      await prisma.departmentDirection.findFirst({
        where: { departmentId, isCurrent: true },
        include: { department: { select: { id: true, name: true } } },
      }),
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { departmentId: string } },
) {
  try {
    const user = await requireAuth(req);
    const departmentId = parseInt(params.departmentId, 10);
    if (isNaN(departmentId)) throw apiError(400, 'Invalid departmentId');

    assertCanEdit(user, departmentId);

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw apiError(404, `Department ${departmentId} not found`);

    const dto = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.departmentDirection.findFirst({
        where: { departmentId, isCurrent: true },
      });

      if (!existing) {
        return tx.departmentDirection.create({
          data: {
            departmentId,
            createdById: user.id,
            overallObjective: dto.overallObjective ?? null,
            currentStatus: dto.currentStatus ?? null,
            transformationDirection: dto.transformationDirection ?? null,
            strategicFunctions: (dto.strategicFunctions ?? []) as unknown as Prisma.InputJsonValue,
            shortTerm: dto.shortTerm ?? null,
            midTerm: dto.midTerm ?? null,
            longTerm: dto.longTerm ?? null,
            keyKpis: (dto.keyKpis ?? []) as unknown as Prisma.InputJsonValue,
            summaryItems: (dto.summaryItems ?? []) as unknown as Prisma.InputJsonValue,
          },
          include: { department: { select: { id: true, name: true } } },
        });
      }

      // Patch-style merge: fields not in dto keep existing values
      const merged = {
        overallObjective: dto.overallObjective ?? existing.overallObjective,
        currentStatus: dto.currentStatus ?? existing.currentStatus,
        transformationDirection: dto.transformationDirection ?? existing.transformationDirection,
        strategicFunctions: dto.strategicFunctions ?? existing.strategicFunctions ?? [],
        shortTerm: dto.shortTerm ?? existing.shortTerm,
        midTerm: dto.midTerm ?? existing.midTerm,
        longTerm: dto.longTerm ?? existing.longTerm,
        keyKpis: dto.keyKpis ?? existing.keyKpis ?? [],
        summaryItems: dto.summaryItems ?? existing.summaryItems ?? [],
      };

      await tx.departmentDirection.update({ where: { id: existing.id }, data: { isCurrent: false } });

      return tx.departmentDirection.create({
        data: {
          departmentId,
          createdById: user.id,
          overallObjective: merged.overallObjective,
          currentStatus: merged.currentStatus,
          transformationDirection: merged.transformationDirection,
          strategicFunctions: merged.strategicFunctions as unknown as Prisma.InputJsonValue,
          shortTerm: merged.shortTerm,
          midTerm: merged.midTerm,
          longTerm: merged.longTerm,
          keyKpis: merged.keyKpis as unknown as Prisma.InputJsonValue,
          summaryItems: merged.summaryItems as unknown as Prisma.InputJsonValue,
        },
        include: { department: { select: { id: true, name: true } } },
      });
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
