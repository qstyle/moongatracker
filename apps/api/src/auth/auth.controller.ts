import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AuthResponse, MeResponse } from '@moongatracker/shared-types';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateMeDto } from './dto/auth.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.auth.register(dto.email, dto.password, dto.name);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('me')
  me(@Req() req: any): Promise<MeResponse> {
    return this.auth.getMe(requireUserId(req));
  }

  @Patch('me')
  updateMe(@Body() dto: UpdateMeDto, @Req() req: any): Promise<MeResponse> {
    return this.auth.updateMe(requireUserId(req), dto.name);
  }
}

/** Only human users have a profile; agent tokens are rejected. */
function requireUserId(req: any): string {
  if (req.user?.type !== 'user')
    throw new ForbiddenException('Only users have a profile');
  return req.user.sub;
}
