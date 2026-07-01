import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const USERNAME_RE = /^[a-z0-9_.-]+$/;

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(USERNAME_RE, {
    message: 'username may contain only a-z, 0-9, and _ . -',
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
