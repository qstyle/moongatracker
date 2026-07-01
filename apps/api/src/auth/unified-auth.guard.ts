import * as crypto from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@moongatracker/data-access';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const rawToken = header?.startsWith('Bearer ')
      ? header.slice(7)
      : undefined;
    if (!rawToken) throw new UnauthorizedException();

    // JWT first
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        username: string;
      }>(rawToken);
      req.user = { type: 'user', sub: payload.sub, username: payload.username };
      return true;
    } catch {
      // fall through to ApiToken lookup
    }

    // ApiToken
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const apiToken = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
    });
    if (!apiToken) throw new UnauthorizedException();

    if (apiToken.revokedAt) throw new UnauthorizedException('Token revoked');

    await this.prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });

    req.user = {
      type: 'agent',
      projectId: apiToken.projectId,
      tokenId: apiToken.id,
      scopes: apiToken.scopes,
    };
    return true;
  }
}
