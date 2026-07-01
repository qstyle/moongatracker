import { IsArray, IsOptional, IsObject } from 'class-validator';

export class SaveCanvasDto {
  @IsArray() nodes!: unknown[];
  @IsArray() edges!: unknown[];
  @IsOptional() @IsObject() viewport?: { x: number; y: number; zoom: number };
}
