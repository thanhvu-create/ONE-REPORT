import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { KpiCycle } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const positionId = parseInt(params.id, 10);
    if (isNaN(positionId)) throw apiError(400, 'Invalid id');

    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) throw apiError(404, `Position ${positionId} not found`);

    if (user.role !== 'admin') {
      if (!['leader', 'manager'].includes(user.role) || user.departmentId !== position.departmentId) {
        throw apiError(403, 'Only the team leader of this department or admins can manage KPIs');
      }
    }

    const body = await req.json();
    const { kpiName, target, cycle, notes } = body;
    if (!kpiName?.trim()) throw apiError(400, 'kpiName is required');
    if (!cycle) throw apiError(400, 'cycle is required');

    return ok(
      await prisma.positionKpi.create({
        data: {
          positionId,
          kpiName: String(kpiName).trim(),
          target: target ?? null,
          cycle: cycle as KpiCycle,
          notes: notes ?? null,
        },
      }),
      201,
    );
  } catch (err) {
    return handleError(err);
  }
}
