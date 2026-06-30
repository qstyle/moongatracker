import { Matches } from 'class-validator';

export class UpdateMemberColorDto {
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color must be a #RRGGBB hex value',
  })
  color!: string;
}
