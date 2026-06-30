import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { CreateCardInput } from '@moongatracker/shared-types';

export class CreateCardDto implements CreateCardInput {
  @IsString()
  @MinLength(1)
  projectId!: string;

  @IsString()
  @MinLength(1)
  columnId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string | null;
}
