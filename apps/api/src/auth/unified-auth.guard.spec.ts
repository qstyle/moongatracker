import { UnifiedAuthGuard } from './unified-auth.guard';

function makeCtx(token: string | undefined, isPublic = false) {
  const req: any = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  return {
    req,
    ctx: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as any,
    reflector: { getAllAndOverride: () => isPublic } as any,
  };
}

describe('UnifiedAuthGuard', () => {
  it('allows public routes without token', async () => {
    const jwt = { verifyAsync: jest.fn() } as any;
    const prisma = { apiToken: { findUnique: jest.fn() } } as any;
    const { ctx, reflector } = makeCtx(undefined, true);
    const guard = new UnifiedAuthGuard(jwt, reflector, prisma);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('rejects with no token on protected route', async () => {
    const jwt = { verifyAsync: jest.fn() } as any;
    const prisma = { apiToken: { findUnique: jest.fn() } } as any;
    const { ctx, reflector } = makeCtx(undefined, false);
    const guard = new UnifiedAuthGuard(jwt, reflector, prisma);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('accepts valid JWT and sets req.user.type=user', async () => {
    const payload = { sub: 'u1', email: 'a@b.com' };
    const jwt = { verifyAsync: jest.fn().mockResolvedValue(payload) } as any;
    const prisma = { apiToken: { findUnique: jest.fn() } } as any;
    const { ctx, req } = makeCtx('valid-jwt');
    const guard = new UnifiedAuthGuard(
      jwt,
      { getAllAndOverride: () => false } as any,
      prisma,
    );
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(req.user).toMatchObject({ sub: 'u1', type: 'user' });
  });

  it('accepts valid API token and sets req.user.type=agent', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('bad')),
    } as any;
    const fakeToken = {
      id: 'tok1',
      projectId: 'org1',
      scopes: ['cards:write'],
      revokedAt: null,
    };
    const prisma = {
      apiToken: {
        findUnique: jest.fn().mockResolvedValue(fakeToken),
        update: jest.fn().mockResolvedValue(fakeToken),
      },
    } as any;
    const { ctx, req } = makeCtx('raw-token');
    const guard = new UnifiedAuthGuard(
      jwt,
      { getAllAndOverride: () => false } as any,
      prisma,
    );
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(req.user).toMatchObject({
      type: 'agent',
      projectId: 'org1',
      tokenId: 'tok1',
      scopes: ['cards:write'],
    });
  });

  it('rejects revoked API token', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('bad')),
    } as any;
    const fakeToken = {
      id: 'tok1',
      projectId: 'org1',
      scopes: ['cards:read'],
      revokedAt: new Date(),
    };
    const prisma = {
      apiToken: {
        findUnique: jest.fn().mockResolvedValue(fakeToken),
        update: jest.fn(),
      },
    } as any;
    const { ctx } = makeCtx('raw-token');
    const guard = new UnifiedAuthGuard(
      jwt,
      { getAllAndOverride: () => false } as any,
      prisma,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow('Token revoked');
  });
});
