import { IsString, MinLength } from 'class-validator';

export class ParseSheetDto {
  @IsString()
  @MinLength(10)
  text: string;
}
