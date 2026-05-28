import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { transcribe, parseStatusReport, parsePerformanceReview } from '@/lib/server/ai';
import { ok, handleError } from '@/lib/server/route';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw apiError(400, 'Audio file is required (multipart field "file")');

    const reportType = (formData.get('reportType') as string | null) ?? 'status_report';
    const reviewPeriod = (formData.get('reviewPeriod') as string | null) ?? 'weekly';

    const buffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribe(buffer, file.name, file.type || 'application/octet-stream');

    if (reportType === 'performance_review') {
      const parsed = await parsePerformanceReview(transcript);
      return ok({ reportType: 'performance_review', transcript, reviewPeriod, ...parsed });
    } else {
      const parsed = await parseStatusReport(transcript);
      return ok({ reportType: 'status_report', transcript, items: parsed.items });
    }
  } catch (err) {
    return handleError(err);
  }
}
