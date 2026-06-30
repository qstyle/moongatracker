import * as crypto from 'crypto';
import { ApiTokensService } from './api-tokens.service';

describe('ApiTokensService', () => {
  it('create() stores SHA-256 hash, returns plain token once', async () => {
    let stored: any;
    const prisma = {
      apiToken: {
        create: jest.fn().mockImplementation(({ data }) => {
          stored = data;
          return {
            id: 'tok1',
            ...data,
            lastUsedAt: null,
            createdAt: new Date(),
            revokedAt: null,
          };
        }),
      },
    } as any;
    const svc = new ApiTokensService(prisma);
    const result = await svc.create('org1', 'ci', ['cards:read']);

    expect(result.token).toHaveLength(64);
    expect(stored.tokenHash).toBe(
      crypto.createHash('sha256').update(result.token).digest('hex'),
    );
    expect(result.token).not.toBe(stored.tokenHash);
    expect(stored.projectId).toBe('org1');
  });

  it('revoke() soft-deletes by orgId and id', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const svc = new ApiTokensService({ apiToken: { updateMany } } as any);
    await svc.revoke('org1', 'tok1');
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'tok1', projectId: 'org1', revokedAt: null },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });

  it('revoke() throws NotFoundException when token not found', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const svc = new ApiTokensService({ apiToken: { updateMany } } as any);
    await expect(svc.revoke('org1', 'missing')).rejects.toThrow('not found');
  });
});
