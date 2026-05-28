import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum KpiCycle {
  monthly = 'monthly',
  quarterly = 'quarterly',
}

export class CreatePositionKpiDto {
  @IsString()
  @IsNotEmpty()
  kpiName: string;

  @IsString()
  @IsOptional()
  target?: string;

  @IsEnum(KpiCycle)
  cycle: KpiCycle;

  @IsString()
  @IsOptional()
  notes?: string;
}
