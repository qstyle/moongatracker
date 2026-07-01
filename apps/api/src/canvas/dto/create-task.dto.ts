import { IsString, MinLength } from 'class-validator';

export class CreateTaskDto {
  @IsString() @MinLength(1) boardId!: string;
}
