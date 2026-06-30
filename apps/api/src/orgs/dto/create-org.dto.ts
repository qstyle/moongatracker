import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}
