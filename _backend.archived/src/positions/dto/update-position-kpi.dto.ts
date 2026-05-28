import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KpiCycle } from './create-position-kpi.dto';

export class UpdatePositionKpiDto {
  @IsString()
  @IsOptional()
  kpiName?: string;

  @IsString()
  @IsOptional()
  target?: string;

  @IsEnum(KpiCycle)
  @IsOptional()
  cycle?: KpiCycle;

  @IsString()
  @IsOptional()
  notes?: string;
}
