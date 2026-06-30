import { IsString, MinLength } from 'class-validator';
import { CreateTaskFromNodeInput } from '@moongatracker/shared-types';

export class CreateTaskFromNodeDto implements CreateTaskFromNodeInput {
  @IsString() @MinLength(1) boardId!: string;
}
