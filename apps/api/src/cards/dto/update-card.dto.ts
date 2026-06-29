import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  COLUMN_KEYS,
  ColumnKey,
  UpdateCardInput,
} from '@moongatracker/shared-types';

export class UpdateCardDto implements UpdateCardInput {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string | null;

  @IsOptional()
  @IsIn(COLUMN_KEYS)
  columnKey?: ColumnKey;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}
