import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/auth.types';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { CreatePositionKpiDto } from './dto/create-position-kpi.dto';
import { UpdatePositionKpiDto } from './dto/update-position-kpi.dto';

const POSITION_INCLUDE = {
  department: { select: { id: true, name: true } },
  kpis: { orderBy: { createdAt: 'asc' as const } },
  _count: { select: { users: true } },
};

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, departmentId?: number) {
    const where: Prisma.PositionWhereInput = {};
    if (user.role === 'admin') {
      if (departmentId) where.departmentId = departmentId;
    } else if (user.role === 'supervisor' || user.role === 'executive') {
      if (departmentId) where.departmentId = departmentId;
    } else {
      // leader / employee — only their own department
      if (!user.departmentId) return [];
      where.departmentId = user.departmentId;
    }
    return this.prisma.position.findMany({
      where,
      include: POSITION_INCLUDE,
      orderBy: [{ departmentId: 'asc' }, { title: 'asc' }],
    });
  }

  async findById(user: AuthenticatedUser, id: number) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: POSITION_INCLUDE,
    });
    if (!position) throw new NotFoundException(`Position ${id} not found`);
    this.assertCanRead(user, position.departmentId);
    return position;
  }

  async create(user: AuthenticatedUser, dto: CreatePositionDto) {
    this.assertCanEdit(user, dto.departmentId);
    await this.assertDepartmentExists(dto.departmentId);
    return this.prisma.position.create({
      data: {
        departmentId: dto.departmentId,
        title: dto.title,
        rolePurpose: dto.rolePurpose ?? null,
        workstreams: (dto.workstreams ?? []) as Prisma.InputJsonValue,
        responsibilities: (dto.responsibilities ?? []) as Prisma.InputJsonValue,
        expectedOutputs: (dto.expectedOutputs ?? []) as Prisma.InputJsonValue,
      },
      include: POSITION_INCLUDE,
    });
  }

  async update(user: AuthenticatedUser, id: number, dto: UpdatePositionDto) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position) throw new NotFoundException(`Position ${id} not found`);
    this.assertCanEdit(user, position.departmentId);
    const data: Prisma.PositionUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.rolePurpose !== undefined) data.rolePurpose = dto.rolePurpose;
    if (dto.workstreams !== undefined) data.workstreams = dto.workstreams as Prisma.InputJsonValue;
    if (dto.responsibilities !== undefined) data.responsibilities = dto.responsibilities as Prisma.InputJsonValue;
    if (dto.expectedOutputs !== undefined) data.expectedOutputs = dto.expectedOutputs as Prisma.InputJsonValue;
    return this.prisma.position.update({ where: { id }, data, include: POSITION_INCLUDE });
  }

  async remove(user: AuthenticatedUser, id: number) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position) throw new NotFoundException(`Position ${id} not found`);
    this.assertCanEdit(user, position.departmentId);
    await this.prisma.position.delete({ where: { id } });
    return { deleted: true };
  }

  // --- KPI sub-resource ---

  async addKpi(user: AuthenticatedUser, positionId: number, dto: CreatePositionKpiDto) {
    const position = await this.prisma.position.findUnique({ where: { id: positionId } });
    if (!position) throw new NotFoundException(`Position ${positionId} not found`);
    this.assertCanEdit(user, position.departmentId);
    return this.prisma.positionKpi.create({
      data: {
        positionId,
        kpiName: dto.kpiName,
        target: dto.target ?? null,
        cycle: dto.cycle,
        notes: dto.notes ?? null,
      },
    });
  }

  async updateKpi(
    user: AuthenticatedUser,
    positionId: number,
    kpiId: number,
    dto: UpdatePositionKpiDto,
  ) {
    const kpi = await this.prisma.positionKpi.findUnique({ where: { id: kpiId } });
    if (!kpi || kpi.positionId !== positionId) throw new NotFoundException(`KPI ${kpiId} not found`);
    const position = await this.prisma.position.findUnique({ where: { id: positionId } });
    this.assertCanEdit(user, position!.departmentId);
    const data: Prisma.PositionKpiUpdateInput = {};
    if (dto.kpiName !== undefined) data.kpiName = dto.kpiName;
    if (dto.target !== undefined) data.target = dto.target;
    if (dto.cycle !== undefined) data.cycle = dto.cycle;
    if (dto.notes !== undefined) data.notes = dto.notes;
    return this.prisma.positionKpi.update({ where: { id: kpiId }, data });
  }

  async removeKpi(user: AuthenticatedUser, positionId: number, kpiId: number) {
    const kpi = await this.prisma.positionKpi.findUnique({ where: { id: kpiId } });
    if (!kpi || kpi.positionId !== positionId) throw new NotFoundException(`KPI ${kpiId} not found`);
    const position = await this.prisma.position.findUnique({ where: { id: positionId } });
    this.assertCanEdit(user, position!.departmentId);
    await this.prisma.positionKpi.delete({ where: { id: kpiId } });
    return { deleted: true };
  }

  // --- helpers ---

  private assertCanRead(user: AuthenticatedUser, departmentId: number) {
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'executive') return;
    if (user.departmentId === departmentId) return;
    throw new ForbiddenException('You can only view positions in your own department');
  }

  private assertCanEdit(user: AuthenticatedUser, departmentId: number) {
    if (user.role === 'admin') return;
    if (user.role === 'leader' && user.departmentId === departmentId) return;
    throw new ForbiddenException('Only the team leader of this department or admins can manage positions');
  }

  private async assertDepartmentExists(departmentId: number) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new NotFoundException(`Department ${departmentId} not found`);
  }
}
