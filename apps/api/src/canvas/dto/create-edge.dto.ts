import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { CreateCanvasEdgeInput } from '@moongatracker/shared-types';

export class CreateEdgeDto implements CreateCanvasEdgeInput {
  @IsString() @MinLength(1) sourceNodeId!: string;
  @IsString() @MinLength(1) targetNodeId!: string;
  @IsOptional() @IsString() @MaxLength(200) label?: string | null;
}
