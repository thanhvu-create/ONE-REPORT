import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreatePositionDto {
  @IsInt()
  @Min(1)
  departmentId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  rolePurpose?: string;

  @IsOptional()
  workstreams?: string[];

  @IsOptional()
  responsibilities?: string[];

  @IsOptional()
  expectedOutputs?: string[];
}
