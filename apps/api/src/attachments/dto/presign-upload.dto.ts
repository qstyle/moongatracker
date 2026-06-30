import { IsString, IsInt, Min, MaxLength } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  @MaxLength(255)
  filename!: string;

  @IsString()
  @MaxLength(100)
  mimeType!: string;

  @IsInt()
  @Min(1)
  size!: number;
}
