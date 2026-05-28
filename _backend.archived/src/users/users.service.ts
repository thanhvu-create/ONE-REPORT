import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  departmentId: true,
  positionId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true } },
  position: { select: { id: true, title: true } },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      select: USER_SELECT,
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    if (dto.departmentId !== undefined) {
      await this.assertDepartmentExists(dto.departmentId);
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName,
        passwordHash,
        role: dto.role,
        departmentId: dto.departmentId ?? null,
        positionId: dto.positionId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: USER_SELECT,
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findById(id);
    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.email !== undefined) data.email = dto.email.toLowerCase();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.departmentId !== undefined) {
      if (dto.departmentId !== null) {
        await this.assertDepartmentExists(dto.departmentId);
      }
      data.departmentId = dto.departmentId;
    }
    if (dto.positionId !== undefined) {
      data.positionId = dto.positionId;
    }
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  private async assertDepartmentExists(departmentId: number) {
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new NotFoundException(`Department ${departmentId} not found`);
  }
}
