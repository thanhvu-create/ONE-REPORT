import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StatusItemDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  currentStatus!: string;

  @IsString()
  @MinLength(1)
  nextSteps!: string;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsString()
  proposal?: string;

  @IsBoolean()
  needsSupport!: boolean;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority!: 'low' | 'medium' | 'high' | 'urgent';

  @IsBoolean()
  hasBlocker!: boolean;
}

export class CreateStatusReportDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => StatusItemDto)
  items!: StatusItemDto[];

  @IsOptional()
  @IsInt()
  departmentId?: number;
}
