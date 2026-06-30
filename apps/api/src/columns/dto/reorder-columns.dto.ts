import { IsArray, IsString, MinLength } from 'class-validator';

export class ReorderColumnsDto {
  @IsString()
  @MinLength(1)
  projectId!: string;

  @IsArray()
  @IsString({ each: true })
  orderedIds!: string[];
}
