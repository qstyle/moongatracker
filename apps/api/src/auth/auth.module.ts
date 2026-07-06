import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '@moonga-studio/data-access';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnifiedAuthGuard } from './unified-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-moongatracker',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    { provide: APP_GUARD, useClass: UnifiedAuthGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
