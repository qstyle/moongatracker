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
          };
        }),
      },
    } as any;
    const svc = new ApiTokensService(prisma);
    const result = await svc.create('u1', 'ci', ['cards:read']);

    expect(result.token).toHaveLength(64);
    expect(stored.tokenHash).toBe(
      crypto.createHash('sha256').update(result.token).digest('hex'),
    );
    expect(result.token).not.toBe(stored.tokenHash);
  });

  it('revoke() filters by both id and userId', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const svc = new ApiTokensService({ apiToken: { deleteMany } } as any);
    await svc.revoke('u1', 'tok1');
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'tok1', userId: 'u1' },
    });
  });
});
