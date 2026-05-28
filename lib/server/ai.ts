import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { prisma } from './prisma';

const ANALYSIS_PROMPT = `You are an internal operations assistant.
Analyze the following employee report.

Return valid JSON only with these fields:
- summary: short summary in English (one or two sentences)
- priority: one of low, medium, high, urgent
- has_blocker: boolean
- issue_category: one of missing_data, technical_issue, waiting_customer, waiting_internal_team, resource_needed, no_issue, other
- reason: short explanation

Employee report:
{{report_text}}`;

const STATUS_REPORT_PARSE_PROMPT = `You are an assistant that converts Vietnamese employee voice transcripts or raw text into structured status reports.

Extract work items from the text. For each item return:
- name: tên hạng mục (string)
- currentStatus: hiện trạng (string)
- nextSteps: bước kế tiếp (string)
- deadline: deadline if mentioned (string ISO date or null)
- proposal: đề xuất nếu có (string or "")
- needsSupport: cần hỗ trợ không (boolean)
- priority: one of low, medium, high, urgent
- hasBlocker: có blocker không (boolean)

Return valid JSON: { "items": [...] }
If no clear items found, create one item from the full text.

Text:
{{text}}`;

const PERFORMANCE_REVIEW_PARSE_PROMPT = `You are an assistant that converts Vietnamese employee text into a structured performance review.

Extract and return valid JSON with these fields:
- achievements: kết quả đạt được (string)
- achievedKpis: KPI đạt/vượt (string)
- gaps: chưa đạt (string)
- gapReasons: lý do cụ thể (string, NOT generic like "chưa kịp")
- opportunities: cơ hội & cải tiến (string or "")
- needsDirectionAdjustment: có cần điều chỉnh chiến lược không (boolean)
- directionAdjustmentDetails: điều chỉnh gì nếu cần (string or "")

Return valid JSON only.

Text:
{{text}}`;

const TASK_TRACKER_PARSE_PROMPT = `You are an assistant that converts raw Vietnamese task tracker data (copied from Google Sheet) into structured status report items.

Each row in the task tracker typically has: task name, status, owner, deadline, notes.
Convert each task into a work item with:
- name: tên hạng mục
- currentStatus: hiện trạng
- nextSteps: bước kế tiếp (infer from status if not explicit)
- deadline: deadline if present (ISO date string or null)
- proposal: đề xuất nếu có (string or "")
- needsSupport: true if task is blocked or waiting (boolean)
- priority: one of low, medium, high, urgent (infer from context)
- hasBlocker: true if blocked, waiting, or at risk (boolean)

Return valid JSON: { "items": [...] }

Task tracker data:
{{text}}`;

function getGenai(): GoogleGenerativeAI | null {
  const key = process.env.GEMINI_API_KEY;
  return key && key.length > 0 ? new GoogleGenerativeAI(key) : null;
}

function getModel(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
}

function getJsonModel(genai: GoogleGenerativeAI): GenerativeModel {
  return genai.getGenerativeModel({
    model: getModel(),
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  });
}

export async function transcribe(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const genai = getGenai();
  if (!genai) return `[mock transcript] Voice report uploaded as ${fileName}.`;
  try {
    const model = genai.getGenerativeModel({ model: getModel() });
    const result = await model.generateContent([
      { inlineData: { mimeType, data: buffer.toString('base64') } },
      'Hãy chuyển đổi audio này thành văn bản tiếng Việt. Chỉ trả về nội dung phát biểu, không thêm giải thích.',
    ]);
    return result.response.text().trim() || '[no speech detected]';
  } catch (err) {
    console.error('Transcription failed:', err);
    return `[transcription failed] Voice report uploaded as ${fileName}.`;
  }
}

export async function parseStatusReport(text: string): Promise<{ items: StatusItem[] }> {
  return parseStructured<{ items: StatusItem[] }>(
    STATUS_REPORT_PARSE_PROMPT, text,
    { items: [{ name: 'Hạng mục', currentStatus: text.slice(0, 200), nextSteps: '', deadline: null, proposal: '', needsSupport: false, priority: 'medium', hasBlocker: false }] },
  );
}

export async function parsePerformanceReview(text: string): Promise<Record<string, unknown>> {
  return parseStructured<Record<string, unknown>>(
    PERFORMANCE_REVIEW_PARSE_PROMPT, text,
    { achievements: text.slice(0, 200), achievedKpis: '', gaps: '', gapReasons: '', opportunities: '', needsDirectionAdjustment: false, directionAdjustmentDetails: '' },
  );
}

export async function parseTaskTracker(text: string): Promise<{ items: StatusItem[] }> {
  return parseStructured<{ items: StatusItem[] }>(
    TASK_TRACKER_PARSE_PROMPT, text,
    { items: [{ name: 'Hạng mục', currentStatus: text.slice(0, 200), nextSteps: '', deadline: null, proposal: '', needsSupport: false, priority: 'medium', hasBlocker: false }] },
  );
}

async function parseStructured<T>(prompt: string, text: string, fallback: T): Promise<T> {
  const genai = getGenai();
  if (!genai) return fallback;
  const filled = prompt.replace('{{text}}', text.slice(0, 6000));
  try {
    const result = await getJsonModel(genai).generateContent(filled);
    return JSON.parse(result.response.text().trim()) as T;
  } catch (err) {
    console.error('parseStructured failed:', err);
    return fallback;
  }
}

export async function logAiAction(reportId: number | null, action: string, input: string, output: string, modelName: string) {
  try {
    await prisma.aiProcessingLog.create({
      data: {
        reportId: reportId ?? undefined,
        action,
        inputText: input.slice(0, 4000),
        outputText: output.slice(0, 4000),
        modelName,
      },
    });
  } catch { /* non-critical */ }
}

export interface StatusItem {
  name: string;
  currentStatus: string;
  nextSteps: string;
  deadline: string | null;
  proposal: string;
  needsSupport: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  hasBlocker: boolean;
}
