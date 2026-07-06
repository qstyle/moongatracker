import { IsArray, IsString } from 'class-validator';

export class ReorderStagesDto {
  @IsString()
  projectId!: string;

  @IsArray()
  @IsString({ each: true })
  orderedIds!: string[];
}
