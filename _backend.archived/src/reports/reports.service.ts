import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportStatus, ReportType, ReviewPeriod, SourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { VoiceService } from '../voice/voice.service';
import { AuthenticatedUser } from '../common/types/auth.types';
import { CreateTextReportDto } from './dto/create-text-report.dto';
import { CreateStatusReportDto } from './dto/create-status-report.dto';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { CreateFromTaskTrackerDto } from './dto/create-from-task-tracker.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FlagReportDto } from './dto/flag-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { ListReportsQuery } from './dto/list-reports.query';

const REPORT_INCLUDE = {
  user: { select: { id: true, fullName: true, email: true, role: true } },
  department: { select: { id: true, name: true } },
  voiceRecord: { select: { id: true, fileName: true, mimeType: true, durationSeconds: true, transcript: true } },
  comments: {
    include: { user: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ReportInclude;

// Roles allowed to submit reports
const SUBMITTER_ROLES = ['employee', 'leader'] as const;
// Roles allowed to read all reports across departments (admin manages system, not report content)
const WIDE_READER_ROLES = ['supervisor', 'executive'] as const;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly voice: VoiceService,
  ) {}

  // ─── Submit: Status Report (text form) ───────────────────────────────────

  async createStatusReport(user: AuthenticatedUser, dto: CreateStatusReportDto) {
    this.assertCanSubmit(user);
    const departmentId = await this.resolveDepartmentId(user, dto.departmentId);

    const hasBlocker = dto.items.some((i) => i.hasBlocker);
    const needsSupport = dto.items.some((i) => i.needsSupport);
    const topPriority = this.topPriorityFromItems(dto.items);

    const report = await this.prisma.report.create({
      data: {
        userId: user.id,
        departmentId,
        reportType: ReportType.status_report,
        sourceType: SourceType.text,
        statusItems: dto.items as unknown as Prisma.InputJsonValue,
        hasBlocker,
        needsSupport,
        aiPriority: topPriority,
      },
      include: REPORT_INCLUDE,
    });
    return report;
  }

  // ─── Submit: Performance Review (text form) ──────────────────────────────

  async createPerformanceReview(user: AuthenticatedUser, dto: CreatePerformanceReviewDto) {
    this.assertCanSubmit(user);
    const departmentId = await this.resolveDepartmentId(user, dto.departmentId);

    const performanceData = {
      achievements: dto.achievements,
      achievedKpis: dto.achievedKpis,
      gaps: dto.gaps,
      gapReasons: dto.gapReasons,
      opportunities: dto.opportunities ?? '',
      needsDirectionAdjustment: dto.needsDirectionAdjustment,
      directionAdjustmentDetails: dto.directionAdjustmentDetails ?? '',
    };

    const report = await this.prisma.report.create({
      data: {
        userId: user.id,
        departmentId,
        reportType: ReportType.performance_review,
        sourceType: SourceType.text,
        performanceData: performanceData as unknown as Prisma.InputJsonValue,
        reviewPeriod: dto.reviewPeriod as ReviewPeriod,
        needsSupport: dto.needsSupport,
        needsDirectionAdjustment: dto.needsDirectionAdjustment,
      },
      include: REPORT_INCLUDE,
    });
    return report;
  }

  // ─── Parse voice only (transcribe + AI, no DB save) ─────────────────────

  async parseVoiceOnly(
    file: Express.Multer.File,
    reportTypeRaw?: string,
    reviewPeriodRaw?: string,
  ) {
    if (!file) throw new BadRequestException('Audio file is required (multipart field "file")');

    const reportType = reportTypeRaw === 'performance_review'
      ? ReportType.performance_review
      : ReportType.status_report;

    const fileName = file.originalname || `voice-${Date.now()}.bin`;
    const mimeType = file.mimetype || 'application/octet-stream';
    const { text: transcript } = await this.ai.transcribe(file.buffer, fileName, mimeType);

    if (reportType === ReportType.status_report) {
      const parsed = await this.ai.parseStatusReport(transcript);
      return { reportType: 'status_report', transcript, items: parsed.items };
    } else {
      const parsed = await this.ai.parsePerformanceReview(transcript);
      return {
        reportType: 'performance_review',
        transcript,
        reviewPeriod: reviewPeriodRaw ?? 'weekly',
        ...parsed,
      };
    }
  }

  // ─── Submit: Voice → AI fill form ────────────────────────────────────────

  async createVoice(
    user: AuthenticatedUser,
    file: Express.Multer.File,
    reportTypeRaw?: string,
    departmentIdRaw?: string,
    reviewPeriodRaw?: string,
  ) {
    this.assertCanSubmit(user);
    if (!file) throw new BadRequestException('Audio file is required (multipart field "file")');

    const reportType = reportTypeRaw === 'performance_review'
      ? ReportType.performance_review
      : ReportType.status_report;

    const departmentId = await this.resolveDepartmentId(
      user,
      departmentIdRaw ? parseInt(departmentIdRaw, 10) : undefined,
    );

    const fileName = file.originalname || `voice-${Date.now()}.bin`;
    const mimeType = file.mimetype || 'application/octet-stream';
    const { text: transcript } = await this.ai.transcribe(file.buffer, fileName, mimeType);
    const stored = await this.voice.saveFromMulter(file);

    if (reportType === ReportType.status_report) {
      const parsed = await this.ai.parseStatusReport(transcript);
      const hasBlocker = parsed.items.some((i: any) => i.hasBlocker);
      const needsSupport = parsed.items.some((i: any) => i.needsSupport);
      const topPriority = this.topPriorityFromItems(parsed.items);

      const report = await this.prisma.report.create({
        data: {
          userId: user.id,
          departmentId,
          reportType: ReportType.status_report,
          sourceType: SourceType.voice,
          transcript,
          statusItems: parsed.items as unknown as Prisma.InputJsonValue,
          hasBlocker,
          needsSupport,
          aiPriority: topPriority,
          voiceRecord: {
            create: { filePath: stored.storageKey, fileName: stored.fileName, mimeType: stored.mimeType, transcript },
          },
        },
        include: REPORT_INCLUDE,
      });
      return { report, ai_filled: true, transcript };
    } else {
      const parsed = await this.ai.parsePerformanceReview(transcript);
      const needsAdjustment = Boolean((parsed as any).needsDirectionAdjustment);
      const report = await this.prisma.report.create({
        data: {
          userId: user.id,
          departmentId,
          reportType: ReportType.performance_review,
          sourceType: SourceType.voice,
          transcript,
          performanceData: parsed as unknown as Prisma.InputJsonValue,
          reviewPeriod: (reviewPeriodRaw as ReviewPeriod) ?? ReviewPeriod.weekly,
          needsDirectionAdjustment: needsAdjustment,
          voiceRecord: {
            create: { filePath: stored.storageKey, fileName: stored.fileName, mimeType: stored.mimeType, transcript },
          },
        },
        include: REPORT_INCLUDE,
      });
      return { report, ai_filled: true, transcript };
    }
  }

  // ─── Submit: Paste Task Tracker → AI convert → Status Report ─────────────

  async createFromTaskTracker(user: AuthenticatedUser, dto: CreateFromTaskTrackerDto) {
    this.assertCanSubmit(user);
    const departmentId = await this.resolveDepartmentId(user, dto.departmentId);

    const parsed = await this.ai.parseTaskTracker(dto.rawText);
    const hasBlocker = parsed.items.some((i: any) => i.hasBlocker);
    const needsSupport = parsed.items.some((i: any) => i.needsSupport);
    const topPriority = this.topPriorityFromItems(parsed.items);

    const report = await this.prisma.report.create({
      data: {
        userId: user.id,
        departmentId,
        reportType: ReportType.status_report,
        sourceType: SourceType.task_tracker,
        originalContent: dto.rawText.slice(0, 5000),
        statusItems: parsed.items as unknown as Prisma.InputJsonValue,
        hasBlocker,
        needsSupport,
        aiPriority: topPriority,
      },
      include: REPORT_INCLUDE,
    });
    return { report, ai_filled: true, item_count: parsed.items.length };
  }

  // ─── Legacy text endpoint (kept for backward compat) ────────────────────

  async createText(user: AuthenticatedUser, dto: CreateTextReportDto) {
    this.assertCanSubmit(user);
    const departmentId = await this.resolveDepartmentId(user, dto.departmentId);
    const report = await this.prisma.report.create({
      data: {
        userId: user.id,
        departmentId,
        reportType: ReportType.status_report,
        sourceType: SourceType.text,
        originalContent: dto.content,
        statusItems: [{ name: 'Báo cáo', currentStatus: dto.content, nextSteps: '', needsSupport: false, priority: 'medium', hasBlocker: false }] as unknown as Prisma.InputJsonValue,
      },
      include: REPORT_INCLUDE,
    });
    const { analysis } = await this.ai.analyze(report.id, dto.content);
    return this.prisma.report.update({
      where: { id: report.id },
      data: { aiSummary: analysis.summary, aiPriority: analysis.priority, hasBlocker: analysis.has_blocker },
      include: REPORT_INCLUDE,
    });
  }

  // ─── List & detail ────────────────────────────────────────────────────────

  async list(user: AuthenticatedUser, query: ListReportsQuery) {
    const where: Prisma.ReportWhereInput = this.scopedWhere(user);

    if (query.reportType) where.reportType = query.reportType;
    if (query.departmentId !== undefined) {
      if (user.role === 'leader' && query.departmentId !== user.departmentId) {
        throw new ForbiddenException('Leaders can only view reports in their own department');
      }
      where.departmentId = query.departmentId;
    }
    if (query.userId !== undefined) {
      if (user.role === 'employee' && query.userId !== user.id) {
        throw new ForbiddenException('Employees can only view their own reports');
      }
      where.userId = query.userId;
    }
    if (query.priority) where.aiPriority = query.priority;
    if (query.status) where.status = query.status;
    if (query.hasBlocker !== undefined) where.hasBlocker = query.hasBlocker === 'true';
    if (query.needsDirectionAdjustment !== undefined) where.needsDirectionAdjustment = query.needsDirectionAdjustment === 'true';
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const limit = Math.min(query.limit ?? 50, 200);
    const offset = query.offset ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({ where, include: REPORT_INCLUDE, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, limit, offset };
  }

  async findOne(user: AuthenticatedUser, id: number) {
    const report = await this.prisma.report.findUnique({ where: { id }, include: REPORT_INCLUDE });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    this.assertCanRead(user, report);
    return report;
  }

  // ─── Status update ────────────────────────────────────────────────────────

  async updateStatus(user: AuthenticatedUser, id: number, dto: UpdateReportStatusDto) {
    if (user.role === 'employee') throw new ForbiddenException('Employees cannot change report status');
    const report = await this.prisma.report.findUnique({ where: { id }, include: REPORT_INCLUDE });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    if (user.role === 'leader' && report.departmentId !== user.departmentId) {
      throw new ForbiddenException('Leaders may only update reports in their department');
    }
    const extra: Record<string, unknown> = {};
    if (dto.status === 'resolved') {
      extra.resolvedAt = new Date();
      extra.resolvedById = user.id;
      if (dto.note) extra.resolvedNote = dto.note;
    }
    return this.prisma.report.update({
      where: { id },
      data: { status: dto.status as ReportStatus, ...extra },
      include: REPORT_INCLUDE,
    });
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  async addComment(user: AuthenticatedUser, reportId: number, dto: CreateCommentDto) {
    if (user.role === 'employee') throw new ForbiddenException('Employees cannot comment on reports');
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException(`Report ${reportId} not found`);
    this.assertCanRead(user, report);
    return this.prisma.comment.create({
      data: { reportId, userId: user.id, content: dto.content },
      include: { user: { select: { id: true, fullName: true, role: true } } },
    });
  }

  // ─── Flag / Escalate (supervisor only) ────────────────────────────────────

  async flagReport(user: AuthenticatedUser, id: number, dto: FlagReportDto) {
    if (user.role !== 'supervisor') throw new ForbiddenException('Only supervisors can flag reports');
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return this.prisma.report.update({
      where: { id },
      data: { isFlagged: true, flagNote: dto.note ?? null, status: ReportStatus.flagged },
      include: REPORT_INCLUDE,
    });
  }

  async unflagReport(user: AuthenticatedUser, id: number) {
    if (user.role !== 'supervisor' && user.role !== 'admin') {
      throw new ForbiddenException('Only supervisors and admins can unflag reports');
    }
    return this.prisma.report.update({
      where: { id },
      data: { isFlagged: false, flagNote: null, status: ReportStatus.reviewed },
      include: REPORT_INCLUDE,
    });
  }

  async exportCsv(user: AuthenticatedUser, query: ListReportsQuery, res: import('express').Response) {
    if (!['supervisor', 'executive', 'admin'].includes(user.role)) {
      throw new ForbiddenException('Only supervisor, executive, and admin can export reports');
    }
    const { items } = await this.list(user, { ...query, limit: 2000, offset: 0 });

    const header = 'ID,Ngày,Nhân viên,Phòng ban,Loại,Nguồn,Ưu tiên,Trạng thái,Blocker,Flag\n';
    const rows = items.map((r) => {
      const cells = [
        r.id,
        new Date(r.createdAt).toLocaleString('vi-VN'),
        `"${r.user.fullName.replace(/"/g, '""')}"`,
        `"${(r.department?.name ?? '').replace(/"/g, '""')}"`,
        r.reportType === 'status_report' ? 'Trạng thái' : 'Đánh giá',
        r.sourceType,
        r.aiPriority ?? '',
        r.status,
        r.hasBlocker ? 'Có' : 'Không',
        r.isFlagged ? 'Có' : 'Không',
      ];
      return cells.join(',');
    });

    const csv = '﻿' + header + rows.join('\n');
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reports-${date}.csv"`);
    res.send(csv);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private assertCanSubmit(user: AuthenticatedUser) {
    if (!(SUBMITTER_ROLES as readonly string[]).includes(user.role)) {
      throw new ForbiddenException(`Role '${user.role}' cannot submit reports`);
    }
  }

  private scopedWhere(user: AuthenticatedUser): Prisma.ReportWhereInput {
    if ((WIDE_READER_ROLES as readonly string[]).includes(user.role)) return {};
    if (user.role === 'leader') {
      return user.departmentId ? { departmentId: user.departmentId } : { id: -1 };
    }
    // employee
    return { userId: user.id };
  }

  private assertCanRead(
    user: AuthenticatedUser,
    report: { userId: number; departmentId: number | null },
  ) {
    if ((WIDE_READER_ROLES as readonly string[]).includes(user.role)) return;
    if (user.role === 'leader') {
      if (report.departmentId === user.departmentId) return;
      throw new ForbiddenException('Report not in your department');
    }
    if (user.role === 'employee') {
      if (report.userId === user.id) return;
      throw new ForbiddenException('You can only view your own reports');
    }
  }

  private async resolveDepartmentId(user: AuthenticatedUser, requested?: number): Promise<number | null> {
    if (requested !== undefined) {
      const dept = await this.prisma.department.findUnique({ where: { id: requested } });
      if (!dept) throw new NotFoundException(`Department ${requested} not found`);
      if (user.role === 'employee' && user.departmentId && requested !== user.departmentId) {
        throw new ForbiddenException('Employees can only file reports under their own department');
      }
      return requested;
    }
    return user.departmentId ?? null;
  }

  private topPriorityFromItems(items: Array<{ priority: string }>): 'low' | 'medium' | 'high' | 'urgent' {
    const order = { urgent: 4, high: 3, medium: 2, low: 1 };
    const top = items.reduce((best, item) => {
      const val = order[item.priority as keyof typeof order] ?? 2;
      return val > (order[best as keyof typeof order] ?? 2) ? item.priority : best;
    }, 'low');
    return top as 'low' | 'medium' | 'high' | 'urgent';
  }
}
