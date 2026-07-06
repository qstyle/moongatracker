import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsIn(['not_started', 'active', 'done'])
  status?: string;
}
