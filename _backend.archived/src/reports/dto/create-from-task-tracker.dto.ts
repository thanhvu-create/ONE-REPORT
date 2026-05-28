import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFromTaskTrackerDto {
  @IsString()
  @MinLength(10, { message: 'Task Tracker content quá ngắn' })
  rawText!: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;
}
