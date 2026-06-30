import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;
}
