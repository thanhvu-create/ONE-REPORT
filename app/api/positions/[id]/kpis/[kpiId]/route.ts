import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';
import { ok, handleError } from '@/lib/server/route';
import { KpiCycle, Prisma } from '@prisma/client';

async function resolveAndAuthorize(
  user: { role: string; departmentId: number | null },
  positionId: number,
  kpiId: number,
) {
  const kpi = await prisma.positionKpi.findUnique({ where: { id: kpiId } });
  if (!kpi || kpi.positionId !== positionId) throw apiError(404, `KPI ${kpiId} not found`);

  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position) throw apiError(404, 'Position not found');

  if (user.role !== 'admin') {
    if (user.role !== 'leader' || user.departmentId !== position.departmentId) {
      throw apiError(403, 'Only the team leader of this department or admins can manage KPIs');
    }
  }

  return kpi;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; kpiId: string } },
) {
  try {
    const user = await requireAuth(req);
    const positionId = parseInt(params.id, 10);
    const kpiId = parseInt(params.kpiId, 10);
    if (isNaN(positionId) || isNaN(kpiId)) throw apiError(400, 'Invalid id');

    await resolveAndAuthorize(user, positionId, kpiId);

    const body = await req.json();
    const { kpiName, target, cycle, notes } = body;

    const data: Prisma.PositionKpiUpdateInput = {};
    if (kpiName !== undefined) data.kpiName = String(kpiName).trim();
    if (target !== undefined) data.target = target;
    if (cycle !== undefined) data.cycle = cycle as KpiCycle;
    if (notes !== undefined) data.notes = notes;

    return ok(await prisma.positionKpi.update({ where: { id: kpiId }, data }));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; kpiId: string } },
) {
  try {
    const user = await requireAuth(req);
    const positionId = parseInt(params.id, 10);
    const kpiId = parseInt(params.kpiId, 10);
    if (isNaN(positionId) || isNaN(kpiId)) throw apiError(400, 'Invalid id');

    await resolveAndAuthorize(user, positionId, kpiId);

    await prisma.positionKpi.delete({ where: { id: kpiId } });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
