import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTextReportDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;
}
