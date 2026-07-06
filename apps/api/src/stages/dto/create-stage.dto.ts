import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string;
}
