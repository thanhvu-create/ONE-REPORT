import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { TaskStatus, Priority, Prisma } from '@prisma/client';

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

function buildBaseWhere(user: { role: string; id: number; departmentId: number | null }): Prisma.TaskWhereInput {
  if (['admin', 'supervisor', 'executive'].includes(user.role)) return {};
  if (user.role === 'leader' || user.role === 'manager') {
    return user.departmentId ? { departmentId: user.departmentId } : { userId: user.id };
  }
  return { userId: user.id };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') as TaskStatus | null;
    const priority = searchParams.get('priority') as Priority | null;
    const overdue = searchParams.get('overdue') === 'true';
    const search = searchParams.get('search') ?? undefined;
    const deptIdParam = searchParams.get('departmentId');
    const userIdParam = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const base = buildBaseWhere(user);
    const extra: Prisma.TaskWhereInput = {};

    if (status) extra.status = status;
    if (priority) extra.priority = priority;
    if (overdue) extra.deadline = { lt: new Date() };
    if (search) {
      extra.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (['admin', 'supervisor', 'executive'].includes(user.role)) {
      if (deptIdParam) extra.departmentId = parseInt(deptIdParam, 10);
      if (userIdParam) extra.userId = parseInt(userIdParam, 10);
    } else if (user.role === 'leader' || user.role === 'manager') {
      if (userIdParam && user.departmentId) extra.userId = parseInt(userIdParam, 10);
    }

    const where: Prisma.TaskWhereInput = { AND: [base, extra, { parentTaskId: null }] };

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        select: TASK_SELECT,
        orderBy: [{ deadline: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.task.count({ where }),
    ]);

    return ok({ items, total, limit, offset });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { title, description, status, priority, deadline, parentTaskId, positionId } = body;

    if (!title?.trim()) throw apiError(400, 'title is required');

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        departmentId: user.departmentId ?? undefined,
        positionId: positionId ?? undefined,
        title: String(title).trim().slice(0, 255),
        description: description ?? null,
        status: (status as TaskStatus) ?? TaskStatus.todo,
        priority: (priority as Priority) ?? Priority.medium,
        deadline: deadline ? new Date(deadline) : null,
        parentTaskId: parentTaskId ?? null,
      },
      select: TASK_SELECT,
    });

    await prisma.taskStatusHistory.create({
      data: { taskId: task.id, toStatus: task.status, changedById: user.id },
    });

    return ok(task, 201);
  } catch (err) {
    return handleError(err);
  }
}
