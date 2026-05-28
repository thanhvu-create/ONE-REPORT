import { IsOptional, IsString } from 'class-validator';

export class FlagReportDto {
  @IsOptional()
  @IsString()
  note?: string;
}
