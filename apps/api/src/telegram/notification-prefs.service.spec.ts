import { NotificationPrefsService } from './notification-prefs.service';

describe('NotificationPrefsService', () => {
  function build(row: Record<string, unknown> | null) {
    const upsert = jest.fn().mockResolvedValue({
      cardMoved: true,
      cardAssigned: false,
      cardCommented: true,
      cardAssignedToAgent: true,
    });
    const prisma = {
      notificationPreferences: {
        findUnique: jest.fn().mockResolvedValue(row),
        upsert,
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new NotificationPrefsService(prisma as any);
    return { service, upsert };
  }

  it('returns all-on defaults when the user has no row', async () => {
    const { service } = build(null);
    expect(await service.getPreferences('u1')).toEqual({
      cardMoved: true,
      cardAssigned: true,
      cardCommented: true,
      cardAssignedToAgent: true,
    });
  });

  it('projects a stored row to the wire shape', async () => {
    const { service } = build({
      id: 'x',
      userId: 'u1',
      cardMoved: false,
      cardAssigned: true,
      cardCommented: false,
      cardAssignedToAgent: true,
      updatedAt: new Date(),
    });
    expect(await service.getPreferences('u1')).toEqual({
      cardMoved: false,
      cardAssigned: true,
      cardCommented: false,
      cardAssignedToAgent: true,
    });
  });

  it('upserts on update, keyed by userId', async () => {
    const { service, upsert } = build(null);
    await service.updatePreferences('u1', { cardAssigned: false });
    expect(upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      create: { userId: 'u1', cardAssigned: false },
      update: { cardAssigned: false },
    });
  });
});
