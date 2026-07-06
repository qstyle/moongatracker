import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  /** Optionally place the board under a roadmap stage of the project. */
  @IsOptional()
  @IsString()
  stageId?: string;
}
