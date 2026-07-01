import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { USERNAME_MESSAGE, USERNAME_RE } from '../../common/username';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(USERNAME_RE, {
    message: USERNAME_MESSAGE,
  })
  username!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;
}

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
