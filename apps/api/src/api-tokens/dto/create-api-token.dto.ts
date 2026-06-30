import { IsArray, IsIn, IsString, MinLength } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @IsIn(['cards:read', 'cards:write'], { each: true })
  scope!: string[];
}
