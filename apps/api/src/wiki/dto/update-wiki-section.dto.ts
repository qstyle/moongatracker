import { IsString, IsOptional, IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { UpdateWikiSectionInput } from '@moongatracker/shared-types';

export class UpdateWikiSectionDto implements UpdateWikiSectionInput {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
