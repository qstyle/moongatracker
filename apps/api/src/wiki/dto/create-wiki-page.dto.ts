import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { CreateWikiPageInput } from '@moongatracker/shared-types';

export class CreateWikiPageDto implements CreateWikiPageInput {
  @IsString()
  @MinLength(1)
  sectionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  body?: string;
}
