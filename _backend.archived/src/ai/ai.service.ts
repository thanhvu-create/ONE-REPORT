import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Priority } from '@prisma/client';
import {
  AiAnalysis,
  AnalysisResult,
  IssueCategory,
  ISSUE_CATEGORIES,
  TranscriptionResult,
} from './ai.types';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genai: GoogleGenerativeAI | null;
  private readonly chatModel: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('gemini.apiKey');
    this.chatModel = this.config.get<string>('gemini.chatModel') ?? 'gemini-2.0-flash';
    if (apiKey && apiKey.length > 0) {
      this.genai = new GoogleGenerativeAI(apiKey);
      this.logger.log(`AiService using Gemini (model=${this.chatModel})`);
    } else {
      this.genai = null;
      this.logger.warn('GEMINI_API_KEY not set — AiService is in MOCK mode');
    }
  }

  isUsingMock(): boolean {
    return this.genai === null;
  }

  async transcribe(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<TranscriptionResult> {
    if (!this.genai) {
      return {
        text: `[mock transcript] Voice report uploaded as ${fileName}.`,
        modelName: 'mock-whisper',
      };
    }
    try {
      const model = this.genai.getGenerativeModel({ model: this.chatModel });
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: buffer.toString('base64'),
          },
        },
        'Hãy chuyển đổi audio này thành văn bản tiếng Việt. Chỉ trả về nội dung phát biểu, không thêm giải thích.',
      ]);
      const text = result.response.text().trim();
      return { text: text || '[no speech detected]', modelName: this.chatModel };
    } catch (err) {
      this.logger.error(`Transcription failed: ${(err as Error).message}`);
      return {
        text: `[transcription failed] Voice report uploaded as ${fileName}.`,
        modelName: `${this.chatModel}-failed`,
      };
    }
  }

  async analyze(reportId: number | null, text: string): Promise<AnalysisResult> {
    const trimmed = (text ?? '').trim();
    if (trimmed.length === 0) {
      return {
        analysis: this.fallback('Empty report'),
        modelName: 'fallback',
        raw: null,
        failed: true,
      };
    }

    if (!this.genai) {
      const mock = this.heuristicAnalysis(trimmed);
      await this.logAnalysis(reportId, trimmed, JSON.stringify(mock), 'mock-analyzer');
      return { analysis: mock, modelName: 'mock-analyzer', raw: JSON.stringify(mock), failed: false };
    }

    const prompt = ANALYSIS_PROMPT.replace('{{report_text}}', trimmed);
    try {
      const model = this.getJsonModel();
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const parsed = this.safeParse(raw);
      await this.logAnalysis(reportId, trimmed, raw, this.chatModel);
      return { analysis: parsed, modelName: this.chatModel, raw, failed: false };
    } catch (err) {
      this.logger.error(`Analysis failed: ${(err as Error).message}`);
      const fallback = this.fallback('AI analysis failed');
      await this.logAnalysis(reportId, trimmed, `error: ${(err as Error).message}`, `${this.chatModel}-failed`);
      return { analysis: fallback, modelName: `${this.chatModel}-failed`, raw: null, failed: true };
    }
  }

  async parseStatusReport(text: string): Promise<{ items: any[] }> {
    return this.parseStructured(STATUS_REPORT_PARSE_PROMPT, text, this.mockStatusItems(text));
  }

  async parsePerformanceReview(text: string): Promise<Record<string, unknown>> {
    return this.parseStructured(PERFORMANCE_REVIEW_PARSE_PROMPT, text, this.mockPerformanceData(text));
  }

  async parseTaskTracker(text: string): Promise<{ items: any[] }> {
    return this.parseStructured(TASK_TRACKER_PARSE_PROMPT, text, this.mockStatusItems(text));
  }

  private getJsonModel(): GenerativeModel {
    return this.genai!.getGenerativeModel({
      model: this.chatModel,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });
  }

  private async parseStructured<T>(prompt: string, text: string, mockResult: T): Promise<T> {
    if (!this.genai) return mockResult;
    const filled = prompt.replace('{{text}}', text.slice(0, 6000));
    try {
      const model = this.getJsonModel();
      const result = await model.generateContent(filled);
      const raw = result.response.text().trim();
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.error(`parseStructured failed: ${(err as Error).message}`);
      return mockResult;
    }
  }

  private mockStatusItems(text: string): { items: any[] } {
    return {
      items: [{
        name: 'Hạng mục',
        currentStatus: text.slice(0, 200),
        nextSteps: '',
        deadline: null,
        proposal: '',
        needsSupport: false,
        priority: 'medium',
        hasBlocker: false,
      }],
    };
  }

  private mockPerformanceData(text: string): Record<string, unknown> {
    return {
      achievements: text.slice(0, 200),
      achievedKpis: '',
      gaps: '',
      gapReasons: '',
      opportunities: '',
      needsDirectionAdjustment: false,
      directionAdjustmentDetails: '',
    };
  }

  private async logAnalysis(reportId: number | null, input: string, output: string, modelName: string) {
    try {
      await this.prisma.aiProcessingLog.create({
        data: {
          reportId: reportId ?? undefined,
          action: 'analyze',
          inputText: input.slice(0, 4000),
          outputText: output.slice(0, 4000),
          modelName,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to write ai_processing_log: ${(err as Error).message}`);
    }
  }

  private safeParse(raw: string): AiAnalysis {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      return {
        summary: this.asNullableString(obj.summary),
        priority: this.normalizePriority(obj.priority),
        has_blocker: Boolean(obj.has_blocker),
        issue_category: this.normalizeIssueCategory(obj.issue_category),
        reason: this.asNullableString(obj.reason),
      };
    } catch {
      return this.fallback('Could not parse AI response');
    }
  }

  private fallback(reason: string): AiAnalysis {
    return {
      summary: null,
      priority: 'medium',
      has_blocker: false,
      issue_category: 'other',
      reason,
    };
  }

  private heuristicAnalysis(text: string): AiAnalysis {
    const lower = text.toLowerCase();
    const blockerHints = ['blocked', 'block ', 'cannot', "can't", 'unable', 'waiting for', 'missing', 'broken', 'down', 'fail'];
    const urgentHints = ['urgent', 'critical', 'production', 'customer impact', 'outage', 'asap'];
    const highHints = ['delay', 'overdue', 'risk'];

    const hasBlocker = blockerHints.some((kw) => lower.includes(kw));
    let priority: Priority = 'low';
    if (urgentHints.some((kw) => lower.includes(kw))) priority = 'urgent';
    else if (hasBlocker) priority = 'high';
    else if (highHints.some((kw) => lower.includes(kw))) priority = 'medium';

    let issue: IssueCategory = 'no_issue';
    if (hasBlocker) {
      if (lower.includes('data') || lower.includes('missing')) issue = 'missing_data';
      else if (lower.includes('customer')) issue = 'waiting_customer';
      else if (lower.includes('team') || lower.includes('colleague')) issue = 'waiting_internal_team';
      else if (lower.includes('tool') || lower.includes('system') || lower.includes('error') || lower.includes('bug')) issue = 'technical_issue';
      else if (lower.includes('resource') || lower.includes('budget') || lower.includes('headcount')) issue = 'resource_needed';
      else issue = 'other';
    }

    const summary = text.length <= 140 ? text : `${text.slice(0, 137)}...`;

    return {
      summary,
      priority,
      has_blocker: hasBlocker,
      issue_category: issue,
      reason: 'mock heuristic',
    };
  }

  private asNullableString(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  }

  private normalizePriority(v: unknown): Priority {
    const allowed: Priority[] = ['low', 'medium', 'high', 'urgent'];
    if (typeof v === 'string' && (allowed as string[]).includes(v.toLowerCase())) {
      return v.toLowerCase() as Priority;
    }
    return 'medium';
  }

  private normalizeIssueCategory(v: unknown): IssueCategory {
    if (typeof v === 'string' && (ISSUE_CATEGORIES as string[]).includes(v.toLowerCase())) {
      return v.toLowerCase() as IssueCategory;
    }
    return 'other';
  }
}
