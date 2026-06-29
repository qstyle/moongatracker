import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  COLUMN_KEYS,
  ColumnKey,
  CreateCardInput,
} from '@moongatracker/shared-types';

export class CreateCardDto implements CreateCardInput {
  @IsString()
  @MinLength(1)
  boardId!: string;

  @IsIn(COLUMN_KEYS)
  columnKey!: ColumnKey;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string | null;
}
