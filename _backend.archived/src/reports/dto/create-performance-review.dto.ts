import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePerformanceReviewDto {
  @IsString()
  @MinLength(1)
  achievements!: string;

  @IsString()
  @MinLength(1)
  achievedKpis!: string;

  @IsString()
  @MinLength(1)
  gaps!: string;

  @IsString()
  @MinLength(10, { message: 'Lý do chưa đạt cần cụ thể (tối thiểu 10 ký tự)' })
  gapReasons!: string;

  @IsOptional()
  @IsString()
  opportunities?: string;

  @IsBoolean()
  needsDirectionAdjustment!: boolean;

  @IsOptional()
  @IsString()
  directionAdjustmentDetails?: string;

  @IsEnum(['weekly', 'monthly', 'quarterly'])
  reviewPeriod!: 'weekly' | 'monthly' | 'quarterly';

  @IsBoolean()
  needsSupport!: boolean;

  @IsOptional()
  @IsInt()
  departmentId?: number;
}
