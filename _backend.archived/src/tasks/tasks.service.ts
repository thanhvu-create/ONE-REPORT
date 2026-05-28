import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AuthenticatedUser } from '../common/types/auth.types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query';
import { ParseSheetDto } from './dto/parse-sheet.dto';

const TASK_SELECT = {
  id: true,
  userId: true,
  departmentId: true,
  positionId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  deadline: true,
  completedAt: true,
  parentTaskId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, fullName: true, role: true } },
  department: { select: { id: true, name: true } },
  position: { select: { id: true, title: true } },
  _count: { select: { subtasks: true } },
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async list(user: AuthenticatedUser, query: ListTasksQuery) {
    const where = this.buildWhere(user, query);
    const limit = Math.min(query.limit ?? 100, 200);
    const offset = query.offset ?? 0;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        select: TASK_SELECT,
        orderBy: [{ deadline: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async findById(user: AuthenticatedUser, id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: {
        ...TASK_SELECT,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          take: 20,
          select: {
            id: true, fromStatus: true, toStatus: true, note: true, changedAt: true,
            changedBy: { select: { id: true, fullName: true } },
          },
        },
        subtasks: { select: TASK_SELECT, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    this.assertCanRead(user, task);
    return task;
  }

  async create(user: AuthenticatedUser, dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        userId: user.id,
        departmentId: user.departmentId ?? undefined,
        positionId: dto.positionId ?? undefined,
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? TaskStatus.todo,
        priority: dto.priority ?? 'medium',
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        parentTaskId: dto.parentTaskId ?? null,
      },
      select: TASK_SELECT,
    });

    await this.recordHistory(task.id, user.id, null, task.status, undefined);
    return task;
  }

  async update(user: AuthenticatedUser, id: number, dto: UpdateTaskDto) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);
    this.assertCanEdit(user, existing);

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.deadline !== undefined) data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.positionId !== undefined) data.positionId = dto.positionId ?? null;

    const statusChanged = dto.status !== undefined && dto.status !== existing.status;
    if (statusChanged) {
      data.status = dto.status;
      if (dto.status === TaskStatus.done) {
        data.completedAt = new Date();
      } else if (existing.status === TaskStatus.done) {
        data.completedAt = null;
      }
    }

    const updated = await this.prisma.task.update({ where: { id }, data, select: TASK_SELECT });

    if (statusChanged) {
      await this.recordHistory(id, user.id, existing.status, dto.status!, dto.statusNote);
    }

    return updated;
  }

  async remove(user: AuthenticatedUser, id: number) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    this.assertCanEdit(user, task);
    await this.prisma.task.delete({ where: { id } });
    return { deleted: true };
  }

  async getStats(user: AuthenticatedUser) {
    const where = this.buildBaseWhere(user);
    const rows = await this.prisma.task.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const counts: Record<string, number> = { todo: 0, doing: 0, blocked: 0, done: 0 };
    for (const r of rows) counts[r.status] = r._count._all;

    const now = new Date();
    const overdueCount = await this.prisma.task.count({
      where: {
        ...where,
        status: { not: TaskStatus.done },
        deadline: { lt: now },
      },
    });

    return { ...counts, overdue: overdueCount, total: Object.values(counts).reduce((a, b) => a + b, 0) };
  }

  async parseFromSheet(user: AuthenticatedUser, dto: ParseSheetDto) {
    const parsed = await this.ai.parseTaskTracker(dto.text);
    // Convert status-report items to task previews (not saved yet)
    const previews = (parsed.items ?? []).map((item: any) => ({
      title: String(item.name ?? item.title ?? '').slice(0, 255) || 'Untitled',
      description: item.currentStatus ?? '',
      priority: item.priority ?? 'medium',
      deadline: item.deadline ?? null,
      status: item.hasBlocker ? TaskStatus.blocked : TaskStatus.todo,
    }));
    return { previews };
  }

  async bulkCreateFromPreviews(
    user: AuthenticatedUser,
    tasks: Array<{ title: string; description?: string; priority?: string; deadline?: string | null; status?: string }>,
  ) {
    const created = await this.prisma.$transaction(
      tasks.map((t) =>
        this.prisma.task.create({
          data: {
            userId: user.id,
            departmentId: user.departmentId ?? undefined,
            title: t.title.slice(0, 255),
            description: t.description ?? null,
            priority: (t.priority as any) ?? 'medium',
            status: (t.status as any) ?? TaskStatus.todo,
            deadline: t.deadline ? new Date(t.deadline) : null,
          },
          select: TASK_SELECT,
        }),
      ),
    );
    return { created };
  }

  // --- helpers ---

  private buildBaseWhere(user: AuthenticatedUser): Prisma.TaskWhereInput {
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'executive') {
      return {};
    }
    if (user.role === 'leader') {
      return user.departmentId ? { departmentId: user.departmentId } : { userId: user.id };
    }
    return { userId: user.id };
  }

  private buildWhere(user: AuthenticatedUser, query: ListTasksQuery): Prisma.TaskWhereInput {
    const base = this.buildBaseWhere(user);
    const extra: Prisma.TaskWhereInput = {};

    if (query.status) extra.status = query.status;
    if (query.priority) extra.priority = query.priority;
    if (query.overdue) extra.deadline = { lt: new Date() };
    if (query.search) {
      extra.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Admins/supervisor/executive can filter down to a dept or user
    if ((user.role === 'admin' || user.role === 'supervisor' || user.role === 'executive')) {
      if (query.departmentId) extra.departmentId = query.departmentId;
      if (query.userId) extra.userId = query.userId;
    } else if (user.role === 'leader') {
      if (query.userId && user.departmentId) extra.userId = query.userId;
    }

    // Never show subtasks in the main list (parent null only)
    return { AND: [base, extra, { parentTaskId: null }] };
  }

  private assertCanRead(user: AuthenticatedUser, task: { userId: number; departmentId: number | null }) {
    if (user.role === 'admin' || user.role === 'supervisor' || user.role === 'executive') return;
    if (task.userId === user.id) return;
    if (user.role === 'leader' && user.departmentId && task.departmentId === user.departmentId) return;
    throw new ForbiddenException('Access denied');
  }

  private assertCanEdit(user: AuthenticatedUser, task: { userId: number; departmentId: number | null }) {
    if (user.role === 'admin') return;
    if (task.userId === user.id) return;
    if (user.role === 'leader' && user.departmentId && task.departmentId === user.departmentId) return;
    throw new ForbiddenException('Access denied');
  }

  private async recordHistory(
    taskId: number,
    userId: number,
    fromStatus: TaskStatus | null,
    toStatus: TaskStatus,
    note?: string,
  ) {
    await this.prisma.taskStatusHistory.create({
      data: {
        taskId,
        fromStatus: fromStatus ?? undefined,
        toStatus,
        changedById: userId,
        note: note ?? null,
      },
    });
  }
}
