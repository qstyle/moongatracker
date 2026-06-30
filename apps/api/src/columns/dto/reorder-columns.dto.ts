import { IsArray, IsString, MinLength } from 'class-validator';

export class ReorderColumnsDto {
  @IsString()
  @MinLength(1)
  boardId!: string;

  @IsArray()
  @IsString({ each: true })
  orderedIds!: string[];
}
