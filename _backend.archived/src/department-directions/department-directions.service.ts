import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/auth.types';
import { UpsertDirectionDto } from './dto/upsert-direction.dto';

@Injectable()
export class DepartmentDirectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthenticatedUser) {
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'executive') {
      return this.prisma.departmentDirection.findMany({
        where: { isCurrent: true },
        include: { department: { select: { id: true, name: true } } },
        orderBy: { department: { name: 'asc' } },
      });
    }
    if (!user.departmentId) return [];
    return this.prisma.departmentDirection.findMany({
      where: { departmentId: user.departmentId, isCurrent: true },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async getCurrentForDepartment(user: AuthenticatedUser, departmentId: number) {
    this.assertCanRead(user, departmentId);
    return this.prisma.departmentDirection.findFirst({
      where: { departmentId, isCurrent: true },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async history(user: AuthenticatedUser, departmentId: number) {
    this.assertCanRead(user, departmentId);
    return this.prisma.departmentDirection.findMany({
      where: { departmentId },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async upsertCurrent(
    user: AuthenticatedUser,
    departmentId: number,
    dto: UpsertDirectionDto,
  ) {
    this.assertCanEdit(user, departmentId);

    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!dept) throw new NotFoundException(`Department ${departmentId} not found`);

    // Snapshot existing current row to history, then create a fresh current row.
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.departmentDirection.findFirst({
        where: { departmentId, isCurrent: true },
      });

      // First time: just create.
      if (!existing) {
        return tx.departmentDirection.create({
          data: this.toCreateData(departmentId, user.id, dto),
          include: { department: { select: { id: true, name: true } } },
        });
      }

      // If nothing was sent, treat as a no-op refresh.
      const merged = this.merge(existing, dto);

      await tx.departmentDirection.update({
        where: { id: existing.id },
        data: { isCurrent: false },
      });

      return tx.departmentDirection.create({
        data: {
          departmentId,
          createdById: user.id,
          overallObjective: merged.overallObjective,
          currentStatus: merged.currentStatus,
          transformationDirection: merged.transformationDirection,
          strategicFunctions: merged.strategicFunctions as Prisma.InputJsonValue,
          shortTerm: merged.shortTerm,
          midTerm: merged.midTerm,
          longTerm: merged.longTerm,
          keyKpis: merged.keyKpis as Prisma.InputJsonValue,
          summaryItems: merged.summaryItems as Prisma.InputJsonValue,
        },
        include: { department: { select: { id: true, name: true } } },
      });
    });
  }

  private toCreateData(
    departmentId: number,
    userId: number,
    dto: UpsertDirectionDto,
  ): Prisma.DepartmentDirectionCreateInput {
    return {
      department: { connect: { id: departmentId } },
      createdById: userId,
      overallObjective: dto.overallObjective ?? null,
      currentStatus: dto.currentStatus ?? null,
      transformationDirection: dto.transformationDirection ?? null,
      strategicFunctions: (dto.strategicFunctions ?? []) as unknown as Prisma.InputJsonValue,
      shortTerm: dto.shortTerm ?? null,
      midTerm: dto.midTerm ?? null,
      longTerm: dto.longTerm ?? null,
      keyKpis: (dto.keyKpis ?? []) as unknown as Prisma.InputJsonValue,
      summaryItems: (dto.summaryItems ?? []) as unknown as Prisma.InputJsonValue,
    };
  }

  /** Patch-style merge: fields not in dto keep existing values. */
  private merge(
    existing: {
      overallObjective: string | null;
      currentStatus: string | null;
      transformationDirection: string | null;
      strategicFunctions: unknown;
      shortTerm: string | null;
      midTerm: string | null;
      longTerm: string | null;
      keyKpis: unknown;
      summaryItems: unknown;
    },
    dto: UpsertDirectionDto,
  ) {
    return {
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
  }

  private assertCanRead(user: AuthenticatedUser, departmentId: number) {
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'executive') return;
    if (user.departmentId === departmentId) return;
    throw new ForbiddenException('You can only view your own department direction');
  }

  private assertCanEdit(user: AuthenticatedUser, departmentId: number) {
    if (user.role === 'admin') return;
    if (user.role === 'leader' && user.departmentId === departmentId) return;
    throw new ForbiddenException('Only the team leader of this department or admins can edit direction');
  }
}
