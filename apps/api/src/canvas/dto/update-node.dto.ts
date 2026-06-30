import { IsString, IsOptional, IsNumber, MaxLength, Matches } from 'class-validator';
import { UpdateCanvasNodeInput } from '@moongatracker/shared-types';

export class UpdateNodeDto implements UpdateCanvasNodeInput {
  @IsOptional() @IsString() @MaxLength(100000) text?: string;
  @IsOptional() @IsNumber() x?: number;
  @IsOptional() @IsNumber() y?: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/) color?: string | null;
}
