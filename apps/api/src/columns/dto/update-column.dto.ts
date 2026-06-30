import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
