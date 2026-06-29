import { IsString, MinLength } from 'class-validator';

export class AttachLabelDto {
  @IsString()
  @MinLength(1)
  labelId!: string;
}
