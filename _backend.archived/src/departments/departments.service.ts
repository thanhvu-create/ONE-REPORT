import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: number) {
    const dept = await this.prisma.department.findUnique({ where: { id } });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: CreateDepartmentDto) {
    try {
      return await this.prisma.department.create({
        data: { name: dto.name, description: dto.description ?? null },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A department with that name already exists');
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findById(id);
    try {
      return await this.prisma.department.update({
        where: { id },
        data: { ...(dto.name !== undefined && { name: dto.name }), ...(dto.description !== undefined && { description: dto.description }) },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A department with that name already exists');
      }
      throw err;
    }
  }
}
