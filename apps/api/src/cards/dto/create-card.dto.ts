import {
  IsString,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { CardPriority, CreateCardInput } from '@moongatracker/shared-types';

export class CreateCardDto implements CreateCardInput {
  @IsString()
  @MinLength(1)
  boardId!: string;

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

  @IsOptional()
  @IsIn(['urgent', 'normal', 'low'])
  priority?: CardPriority | null;
}
