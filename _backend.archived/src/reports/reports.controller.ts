import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReportsService } from './reports.service';
import { CreateTextReportDto } from './dto/create-text-report.dto';
import { CreateStatusReportDto } from './dto/create-status-report.dto';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { CreateFromTaskTrackerDto } from './dto/create-from-task-tracker.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FlagReportDto } from './dto/flag-report.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { ListReportsQuery } from './dto/list-reports.query';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/auth.types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // ─── Submit ──────────────────────────────────────────────────────────────

  /** Submit a Báo cáo Trạng thái Hạng mục (text form) */
  @Post('status')
  createStatus(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStatusReportDto) {
    return this.reports.createStatusReport(user, dto);
  }

  /** Submit an Đánh giá Kết quả (text form) */
  @Post('performance')
  createPerformance(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePerformanceReviewDto) {
    return this.reports.createPerformanceReview(user, dto);
  }

  /** Voice → transcribe + AI parse → return parsed data for user review (no DB save) */
  @Post('voice/parse')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  parseVoice(
    @UploadedFile() file: Express.Multer.File,
    @Body('reportType') reportType?: string,
    @Body('reviewPeriod') reviewPeriod?: string,
  ) {
    return this.reports.parseVoiceOnly(file, reportType, reviewPeriod);
  }

  /** Voice → AI fill → status or performance report */
  @Post('voice')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }))
  createVoice(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('reportType') reportType?: string,
    @Body('departmentId') departmentId?: string,
    @Body('reviewPeriod') reviewPeriod?: string,
  ) {
    return this.reports.createVoice(user, file, reportType, departmentId, reviewPeriod);
  }

  /** Paste Task Tracker text → AI convert → Status Report */
  @Post('from-task-tracker')
  createFromTaskTracker(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFromTaskTrackerDto) {
    return this.reports.createFromTaskTracker(user, dto);
  }

  /** Legacy text endpoint */
  @Post('text')
  createText(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTextReportDto) {
    return this.reports.createText(user, dto);
  }

  // ─── List & detail ────────────────────────────────────────────────────────

  /** Export filtered reports as CSV — supervisor / admin / executive only */
  @Get('export')
  async exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReportsQuery,
    @Res() res: import('@nestjs/common').Response,
  ) {
    return this.reports.exportCsv(user, query, res as any);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListReportsQuery) {
    return this.reports.list(user, query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.reports.findOne(user, id);
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.reports.updateStatus(user, id, dto);
  }

  // ─── Comments ─────────────────────────────────────────────────────────────

  @Post(':id/comments')
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.reports.addComment(user, id, dto);
  }

  // ─── Flag / Escalate ──────────────────────────────────────────────────────

  @Patch(':id/flag')
  flag(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FlagReportDto,
  ) {
    return this.reports.flagReport(user, id, dto);
  }

  @Delete(':id/flag')
  unflag(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.reports.unflagReport(user, id);
  }
}
