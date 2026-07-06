import { StagesService } from './stages.service';

function make(over: any = {}) {
  const prisma: any = {
    membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    stage: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({ id: 's1', projectId: 'p1' }),
      aggregate: jest.fn().mockResolvedValue({ _max: { order: 2 } }),
      create: jest
        .fn()
        .mockImplementation(({ data }: any) => ({
          id: 's9',
          key: null,
          status: 'not_started',
          boards: [],
          ...data,
        })),
      createMany: jest.fn().mockResolvedValue({ count: 5 }),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockImplementation(({ data }: any) => ({
        id: 's1',
        projectId: 'p1',
        key: null,
        title: 't',
        order: 0,
        status: 'not_started',
        boards: [],
        ...data,
      })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({}),
    },
    ...over,
  };
  return { svc: new StagesService(prisma), prisma };
}

describe('StagesService', () => {
  it('create() appends after the max order', async () => {
    const { svc, prisma } = make();
    const s = await svc.create('p1', 'X', 'u1');
    expect(prisma.stage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ order: 3, title: 'X', projectId: 'p1' }),
      }),
    );
    expect(s.title).toBe('X');
  });

  it('seedDefaults() is a no-op when stages already exist', async () => {
    const { svc, prisma } = make();
    prisma.stage.count.mockResolvedValue(5);
    await svc.seedDefaults('p1', 'u1');
    expect(prisma.stage.createMany).not.toHaveBeenCalled();
  });

  it('seedDefaults() seeds when empty', async () => {
    const { svc, prisma } = make();
    prisma.stage.count.mockResolvedValue(0);
    await svc.seedDefaults('p1', 'u1');
    expect(prisma.stage.createMany).toHaveBeenCalled();
  });

  it('remove() deletes the stage (boards detach via FK SetNull)', async () => {
    const { svc, prisma } = make();
    await svc.remove('s1', 'u1');
    expect(prisma.stage.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('reorder() writes sequential order per id', async () => {
    const { svc, prisma } = make();
    await svc.reorder('p1', ['a', 'b'], 'u1');
    expect(prisma.stage.updateMany).toHaveBeenCalledWith({
      where: { id: 'b', projectId: 'p1' },
      data: { order: 1 },
    });
  });
});
