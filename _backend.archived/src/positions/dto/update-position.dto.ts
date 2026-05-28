import { IsOptional, IsString } from 'class-validator';

export class UpdatePositionDto {
  @IsString()
  @IsOptional()
  title?: string;

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
