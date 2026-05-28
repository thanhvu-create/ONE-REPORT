import { NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { transcribe, parseStatusReport, parsePerformanceReview } from '@/lib/server/ai';
import { assertCanSubmit, resolveDepartmentId, createVoiceStatusReport, createVoicePerformanceReview } from '@/lib/server/reports';
import { ok, handleError } from '@/lib/server/route';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    assertCanSubmit(user);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw apiError(400, 'Audio file is required (multipart field "file")');

    const reportType = (formData.get('reportType') as string | null) ?? 'status_report';
    const reviewPeriod = (formData.get('reviewPeriod') as string | null) ?? 'weekly';
    const deptIdRaw = formData.get('departmentId') as string | null;
    const departmentId = await resolveDepartmentId(user, deptIdRaw ? parseInt(deptIdRaw, 10) : undefined);

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || `voice-${Date.now()}.bin`;
    const mimeType = file.type || 'application/octet-stream';
    const transcript = await transcribe(buffer, fileName, mimeType);
    const storageKey = `voice/${Date.now()}-${fileName}`;

    if (reportType === 'performance_review') {
      const parsed = await parsePerformanceReview(transcript);
      const report = await createVoicePerformanceReview(user, parsed, transcript, reviewPeriod, departmentId, storageKey, fileName, mimeType);
      return ok({ report, ai_filled: true, transcript }, 201);
    } else {
      const parsed = await parseStatusReport(transcript);
      const report = await createVoiceStatusReport(user, parsed.items, transcript, departmentId, storageKey, fileName, mimeType);
      return ok({ report, ai_filled: true, transcript }, 201);
    }
  } catch (err) {
    return handleError(err);
  }
}
