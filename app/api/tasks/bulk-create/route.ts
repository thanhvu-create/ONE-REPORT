import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { TaskStatus, Priority } from '@prisma/client';

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

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { tasks } = await req.json();

    if (!Array.isArray(tasks) || tasks.length === 0) throw apiError(400, 'tasks array is required');
    if (tasks.length > 50) throw apiError(400, 'Max 50 tasks per bulk create');

    const created = await prisma.$transaction(
      tasks.map((t: { title?: string; description?: string; priority?: string; deadline?: string | null; status?: string }) =>
        prisma.task.create({
          data: {
            userId: user.id,
            departmentId: user.departmentId ?? undefined,
            title: String(t.title ?? '').slice(0, 255) || 'Untitled',
            description: t.description ?? null,
            priority: (t.priority as Priority) ?? Priority.medium,
            status: (t.status as TaskStatus) ?? TaskStatus.todo,
            deadline: t.deadline ? new Date(t.deadline) : null,
          },
          select: TASK_SELECT,
        }),
      ),
    );

    return ok({ created }, 201);
  } catch (err) {
    return handleError(err);
  }
}
