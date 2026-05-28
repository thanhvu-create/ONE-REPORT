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

type TaskLike = { userId: number; departmentId: number | null };
type UserLike = { role: string; id: number; departmentId: number | null };

function canRead(user: UserLike, task: TaskLike) {
  if (['admin', 'supervisor', 'executive'].includes(user.role)) return true;
  if (task.userId === user.id) return true;
  if ((user.role === 'leader' || user.role === 'manager') && user.departmentId && task.departmentId === user.departmentId) return true;
  return false;
}

function canEdit(user: UserLike, task: TaskLike) {
  if (user.role === 'admin') return true;
  if (task.userId === user.id) return true;
  if ((user.role === 'leader' || user.role === 'manager') && user.departmentId && task.departmentId === user.departmentId) return true;
  return false;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');

    const task = await prisma.task.findUnique({
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

    if (!task) throw apiError(404, `Task ${id} not found`);
    if (!canRead(user, task)) throw apiError(403, 'Access denied');

    return ok(task);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw apiError(404, `Task ${id} not found`);
    if (!canEdit(user, existing)) throw apiError(403, 'Access denied');

    const body = await req.json();
    const { title, description, priority, deadline, positionId, status, statusNote } = body;

    const data: Prisma.TaskUpdateInput = {};
    if (title !== undefined) data.title = String(title).trim().slice(0, 255);
    if (description !== undefined) data.description = description;
    if (priority !== undefined) data.priority = priority as Priority;
    if (deadline !== undefined) data.deadline = deadline ? new Date(deadline) : null;
    if (positionId !== undefined) data.position = positionId ? { connect: { id: positionId } } : { disconnect: true };

    const statusChanged = status !== undefined && status !== existing.status;
    if (statusChanged) {
      data.status = status as TaskStatus;
      if (status === TaskStatus.done) {
        data.completedAt = new Date();
      } else if (existing.status === TaskStatus.done) {
        data.completedAt = null;
      }
    }

    const updated = await prisma.task.update({ where: { id }, data, select: TASK_SELECT });

    if (statusChanged) {
      await prisma.taskStatusHistory.create({
        data: {
          taskId: id,
          fromStatus: existing.status,
          toStatus: status as TaskStatus,
          changedById: user.id,
          note: statusNote ?? null,
        },
      });
    }

    return ok(updated);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) throw apiError(400, 'Invalid id');

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw apiError(404, `Task ${id} not found`);
    if (!canEdit(user, task)) throw apiError(403, 'Access denied');

    await prisma.task.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
