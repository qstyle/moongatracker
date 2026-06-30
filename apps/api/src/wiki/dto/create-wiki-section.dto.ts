import { IsString, MinLength, MaxLength } from 'class-validator';
import { CreateWikiSectionInput } from '@moongatracker/shared-types';

export class CreateWikiSectionDto implements CreateWikiSectionInput {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;
}
