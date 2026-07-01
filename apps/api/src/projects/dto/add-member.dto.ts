import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USERNAME_MESSAGE, USERNAME_RE } from '../../common/username';

export class AddMemberDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(USERNAME_RE, {
    message: USERNAME_MESSAGE,
  })
  username!: string;
}
