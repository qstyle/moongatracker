import { IsString, IsOptional, IsNumber, MaxLength, Matches } from 'class-validator';
import { CreateCanvasNodeInput } from '@moongatracker/shared-types';

export class CreateNodeDto implements CreateCanvasNodeInput {
  @IsOptional() @IsString() @MaxLength(100000) text?: string;
  @IsNumber() x!: number;
  @IsNumber() y!: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string | null;
}
