import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { KeyKpiDto, StrategicFunctionDto, SummaryItemDto } from './strategic-function.dto';

export class UpsertDirectionDto {
  // 1. Overall direction
  @IsOptional() @IsString() overallObjective?: string;
  @IsOptional() @IsString() currentStatus?: string;
  @IsOptional() @IsString() transformationDirection?: string;

  // 2. Strategic direction by function
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StrategicFunctionDto)
  strategicFunctions?: StrategicFunctionDto[];

  // 3. Timeline-based direction
  @IsOptional() @IsString() shortTerm?: string;
  @IsOptional() @IsString() midTerm?: string;
  @IsOptional() @IsString() longTerm?: string;

  // 4. Key KPIs
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KeyKpiDto)
  keyKpis?: KeyKpiDto[];

  // 5. Summary
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SummaryItemDto)
  summaryItems?: SummaryItemDto[];
}
