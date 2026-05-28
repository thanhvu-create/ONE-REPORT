import { IsString, MaxLength } from 'class-validator';

export class StrategicFunctionDto {
  @IsString()
  @MaxLength(255)
  function!: string;

  @IsString()
  keyDirection!: string;
}

export class KeyKpiDto {
  @IsString()
  @MaxLength(255)
  kpi!: string;

  @IsString()
  @MaxLength(255)
  target!: string;
}

export class SummaryItemDto {
  @IsString()
  @MaxLength(255)
  item!: string;

  @IsString()
  details!: string;
}
