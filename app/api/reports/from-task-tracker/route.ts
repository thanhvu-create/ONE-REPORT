import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { parseTaskTracker } from '@/lib/server/ai';
import { assertCanSubmit, resolveDepartmentId, createFromTaskTracker } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    assertCanSubmit(user);
    const { rawText, departmentId: deptIdRaw } = await req.json();
    if (!rawText || typeof rawText !== 'string') throw apiError(400, 'rawText is required');
    const departmentId = await resolveDepartmentId(user, deptIdRaw);
    const parsed = await parseTaskTracker(rawText);
    const report = await createFromTaskTracker(user, rawText, parsed.items, departmentId);
    return ok({ report, ai_filled: true, item_count: parsed.items.length }, 201);
  } catch (err) {
    return handleError(err);
  }
}
