import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UpdateCardInput, CardPriority } from '@moonga-studio/shared-types';

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
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsIn(['urgent', 'normal', 'low', null])
  priority?: CardPriority | null;

  @IsOptional()
  @IsString()
  assigneeType?: string | null;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}
