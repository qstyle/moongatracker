import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MinLength(1)
  boardId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;
}
