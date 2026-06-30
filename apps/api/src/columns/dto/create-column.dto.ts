import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MinLength(1)
  projectId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;
}
