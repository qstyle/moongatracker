import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { UpdateWikiPageInput } from '@moonga-studio/shared-types';

export class UpdateWikiPageDto implements UpdateWikiPageInput {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  body?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sectionId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
