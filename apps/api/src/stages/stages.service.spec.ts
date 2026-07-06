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

/** Build a prisma mock wired for scaffold tests. */
function makeScaffold(stageOverride: any = {}, boardFindFirst: any = null) {
  const txBoard = {
    aggregate: jest.fn().mockResolvedValue({ _max: { seq: 0 } }),
    create: jest.fn().mockResolvedValue({ id: 'b1' }),
  };
  const txColumn = { createMany: jest.fn().mockResolvedValue({ count: 4 }) };
  const txCard = { createMany: jest.fn().mockResolvedValue({}) };
  const txWikiSection = {
    aggregate: jest.fn().mockResolvedValue({ _max: { order: -1 } }),
    create: jest.fn().mockResolvedValue({ id: 'ws1' }),
  };
  const txWikiPage = { createMany: jest.fn().mockResolvedValue({}) };
  const txColumn2 = { findFirst: jest.fn().mockResolvedValue({ id: 'col1' }) };

  // Merge all tx sub-mocks
  const tx: any = {
    board: { ...txBoard },
    column: { ...txColumn, findFirst: txColumn2.findFirst },
    card: txCard,
    wikiSection: txWikiSection,
    wikiPage: txWikiPage,
  };

  const prisma: any = {
    membership: { findUnique: jest.fn().mockResolvedValue({ id: 'm1' }) },
    stage: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'st1',
        projectId: 'p1',
        key: 'discovery',
        title: 'Дискавери',
        ...stageOverride,
      }),
      aggregate: jest.fn().mockResolvedValue({ _max: { order: 2 } }),
      create: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    board: {
      findFirst: jest.fn().mockResolvedValue(boardFindFirst),
    },
    $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
  };

  return { svc: new StagesService(prisma), prisma, tx };
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

  describe('scaffold()', () => {
    it('template stage: creates board+columns, seeds cards and wiki section with stageId; returns boardId', async () => {
      const { svc, tx } = makeScaffold({ key: 'discovery' });
      const result = await svc.scaffold('p1', 'st1', 'u1');

      expect(result).toEqual({ boardId: 'b1' });

      // Board created with stageId
      expect(tx.board.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stageId: 'st1', projectId: 'p1' }),
        }),
      );

      // Cards seeded into column order=0
      expect(tx.card.createMany).toHaveBeenCalled();
      const cardArgs = tx.card.createMany.mock.calls[0][0];
      expect(cardArgs.data.length).toBeGreaterThan(0);
      // Each card has required fields
      expect(cardArgs.data[0]).toMatchObject({
        boardId: 'b1',
        columnId: 'col1',
        number: 1,
        authorType: 'agent',
      });

      // WikiSection created with stageId
      expect(tx.wikiSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ stageId: 'st1', projectId: 'p1' }),
        }),
      );

      // WikiPages include the "Инструменты и ссылки" page
      expect(tx.wikiPage.createMany).toHaveBeenCalled();
      const pageArgs = tx.wikiPage.createMany.mock.calls[0][0];
      const titles = pageArgs.data.map((p: any) => p.title);
      expect(titles).toContain('Инструменты и ссылки');
    });

    it('idempotent: when board already exists, returns existing boardId without re-seeding', async () => {
      const { svc, tx, prisma } = makeScaffold({ key: 'discovery' }, { id: 'existing-board' });
      const result = await svc.scaffold('p1', 'st1', 'u1');

      expect(result).toEqual({ boardId: 'existing-board' });
      expect(tx.card.createMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when stage does not exist', async () => {
      // stage.findUnique returns null → service must throw
      const { svc } = makeScaffold();
      svc['prisma'].stage.findUnique.mockResolvedValue(null);

      await expect(svc.scaffold('p1', 'st1', 'u1')).rejects.toThrow(
        'Stage not found in project',
      );
    });

    it('throws NotFoundException when stage belongs to a different project', async () => {
      // Stage exists but projectId is 'other-project', not the requested 'p1'
      const { svc } = makeScaffold({ projectId: 'other-project' });

      await expect(svc.scaffold('p1', 'st1', 'u1')).rejects.toThrow(
        'Stage not found in project',
      );
    });

    it('custom stage (null key): creates board+columns but does NOT seed cards or wiki', async () => {
      const { svc, tx } = makeScaffold({ key: null, title: 'Custom' });
      const result = await svc.scaffold('p1', 'st1', 'u1');

      expect(result).toEqual({ boardId: 'b1' });
      expect(tx.board.create).toHaveBeenCalled();
      expect(tx.column.createMany).toHaveBeenCalled();
      expect(tx.card.createMany).not.toHaveBeenCalled();
      expect(tx.wikiSection.create).not.toHaveBeenCalled();
    });
  });
});
