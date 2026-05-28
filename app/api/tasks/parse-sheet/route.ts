import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { ok, handleError } from '@/lib/server/route';
import { parseTaskTracker } from '@/lib/server/ai';
import { TaskStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const { text } = await req.json();
    if (!text?.trim()) throw apiError(400, 'text is required');

    const parsed = await parseTaskTracker(text);
    const previews = (parsed.items ?? []).map((item) => ({
      title: String(item.name ?? '').slice(0, 255) || 'Untitled',
      description: item.currentStatus ?? '',
      priority: item.priority ?? 'medium',
      deadline: item.deadline ?? null,
      status: item.hasBlocker ? TaskStatus.blocked : TaskStatus.todo,
    }));

    return ok({ previews });
  } catch (err) {
    return handleError(err);
  }
}
