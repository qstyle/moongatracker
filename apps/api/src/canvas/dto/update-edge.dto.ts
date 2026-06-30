import { IsString, IsOptional, MaxLength } from 'class-validator';
import { UpdateCanvasEdgeInput } from '@moongatracker/shared-types';

export class UpdateEdgeDto implements UpdateCanvasEdgeInput {
  @IsOptional() @IsString() @MaxLength(200) label?: string | null;
}
