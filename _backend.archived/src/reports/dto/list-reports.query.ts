import { Transform } from 'class-transformer';
import { IsBooleanString, IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { Priority, ReportStatus, ReportType } from '@prisma/client';

export class ListReportsQuery {
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : parseInt(value, 10)))
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : parseInt(value, 10)))
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsBooleanString()
  hasBlocker?: 'true' | 'false';

  @IsOptional()
  @IsBooleanString()
  needsDirectionAdjustment?: 'true' | 'false';

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : parseInt(value, 10)))
  @IsInt()
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : parseInt(value, 10)))
  @IsInt()
  offset?: number;
}
