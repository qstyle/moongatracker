import { TelegramLinkService } from './telegram-link.service';

function makePrisma(overrides: any = {}) {
  const prisma: any = {
    telegramLinkCode: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    telegramLink: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    // array form used by createCode/consume
    $transaction: jest.fn((ops: any) =>
      Array.isArray(ops) ? Promise.all(ops) : ops(prisma),
    ),
    ...overrides,
  };
  return prisma;
}

describe('TelegramLinkService.consume', () => {
  it('rejects an unknown code', async () => {
    const prisma = makePrisma();
    prisma.telegramLinkCode.findUnique.mockResolvedValue(null);
    const svc = new TelegramLinkService(prisma);

    const result = await svc.consume('nope', '123');

    expect(result).toEqual({ ok: false, reason: 'unknown' });
    expect(prisma.telegramLink.upsert).not.toHaveBeenCalled();
  });

  it('rejects and deletes an expired code', async () => {
    const prisma = makePrisma();
    prisma.telegramLinkCode.findUnique.mockResolvedValue({
      code: 'c',
      userId: 'u1',
      expiresAt: new Date(Date.now() - 1000),
    });
    const svc = new TelegramLinkService(prisma);

    const result = await svc.consume('c', '123');

    expect(result).toEqual({ ok: false, reason: 'expired' });
    expect(prisma.telegramLinkCode.delete).toHaveBeenCalledWith({
      where: { code: 'c' },
    });
    expect(prisma.telegramLink.upsert).not.toHaveBeenCalled();
  });

  it('binds the chat for a valid code and clears the codes', async () => {
    const prisma = makePrisma();
    prisma.telegramLinkCode.findUnique.mockResolvedValue({
      code: 'c',
      userId: 'u1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const svc = new TelegramLinkService(prisma);

    const result = await svc.consume('c', '999');

    expect(result).toEqual({ ok: true });
    expect(prisma.telegramLink.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', chatId: '999' },
      update: { chatId: '999' },
    });
  });
});

describe('TelegramLinkService.getStatus', () => {
  it('reports connected with the chat id', async () => {
    const prisma = makePrisma();
    prisma.telegramLink.findUnique.mockResolvedValue({
      userId: 'u1',
      chatId: '555',
    });
    const svc = new TelegramLinkService(prisma);

    expect(await svc.getStatus('u1')).toEqual({
      connected: true,
      chatId: '555',
    });
  });

  it('reports disconnected when no link exists', async () => {
    const prisma = makePrisma();
    prisma.telegramLink.findUnique.mockResolvedValue(null);
    const svc = new TelegramLinkService(prisma);

    expect(await svc.getStatus('u1')).toEqual({ connected: false });
  });
});
