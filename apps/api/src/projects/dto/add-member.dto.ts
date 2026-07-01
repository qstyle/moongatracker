import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AddMemberDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_.-]+$/, {
    message: 'username may contain only a-z, 0-9, and _ . -',
  })
  username!: string;
}
