import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProposalsService } from './proposals.service';

const OWNER = { type: 'user', sub: 'owner1' } as any;
const OTHER = { type: 'user', sub: 'intruder' } as any;

function build(over: any = {}) {
  const emit = jest.fn();
  const prisma: any = {
    card: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'c1',
        title: 'Задача',
        number: 3,
        board: { id: 'b1', projectId: 'p1', name: 'ENG', seq: 1 },
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    project: {
      findUnique: jest.fn().mockResolvedValue({ id: 'p1', ownerId: 'owner1' }),
    },
    proposal: {
      create: jest.fn().mockImplementation(({ data }: any) => ({
        id: 'prop1',
        status: 'pending', // DB default
        createdAt: new Date('2025-01-01'),
        resolvedAt: null,
        ...data,
      })),
      findUnique: jest.fn().mockResolvedValue({
        id: 'prop1',
        projectId: 'p1',
        cardId: 'c1',
        action: 'delete_card',
        status: 'pending',
        actorType: 'agent',
        actorId: 'tok1',
        payload: { cardTitle: 'Задача', cardKey: 'ENG1-3' },
        createdAt: new Date('2025-01-01'),
        resolvedAt: null,
      }),
      update: jest.fn().mockImplementation(({ data }: any) => ({
        id: 'prop1',
        projectId: 'p1',
        cardId: 'c1',
        action: 'delete_card',
        actorType: 'agent',
        actorId: 'tok1',
        payload: { cardTitle: 'Задача', cardKey: 'ENG1-3' },
        createdAt: new Date('2025-01-01'),
        resolvedAt: new Date('2025-01-02'),
        ...data,
      })),
    },
    ...over,
  };
  return { service: new ProposalsService(prisma, { emit } as any), prisma, emit };
}

describe('ProposalsService', () => {
  it('createDeleteCard() creates a pending proposal and emits an event', async () => {
    const { service, emit } = build();
    const p = await service.createDeleteCard('c1', 'дубль', OWNER);
    expect(p.status).toBe('pending');
    expect(p.action).toBe('delete_card');
    expect(p.cardKey).toBe('ENG1-3');
    expect(emit).toHaveBeenCalledWith('proposal.created', { proposalId: 'prop1' });
  });

  it('approve() by the owner deletes the card and marks it approved', async () => {
    const { service, prisma } = build();
    const p = await service.approve('prop1', OWNER);
    expect(prisma.card.deleteMany).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(p.status).toBe('approved');
  });

  it('approve() by a non-owner is forbidden and deletes nothing', async () => {
    const { service, prisma } = build();
    await expect(service.approve('prop1', OTHER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.card.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects an already-resolved proposal', async () => {
    const { service } = build({
      proposal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prop1',
          projectId: 'p1',
          cardId: 'c1',
          action: 'delete_card',
          status: 'approved',
          payload: {},
          createdAt: new Date(),
          resolvedAt: new Date(),
        }),
        update: jest.fn(),
      },
    });
    await expect(service.approve('prop1', OWNER)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reject() marks rejected without deleting the card', async () => {
    const { service, prisma } = build();
    const p = await service.reject('prop1', OWNER);
    expect(prisma.card.deleteMany).not.toHaveBeenCalled();
    expect(p.status).toBe('rejected');
  });
});
