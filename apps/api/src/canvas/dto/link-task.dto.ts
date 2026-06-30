import { IsString, MinLength } from 'class-validator';
import { LinkTaskInput } from '@moongatracker/shared-types';

export class LinkTaskDto implements LinkTaskInput {
  @IsString() @MinLength(1) cardId!: string;
}
