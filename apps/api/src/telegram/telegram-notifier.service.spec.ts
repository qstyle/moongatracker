import { TelegramNotifierService, recipientUserIds } from './telegram-notifier.service';
import { CardAssignedPayload, EventActor } from './telegram.events';

const user = (id: string): EventActor => ({ type: 'user', id });
const agent = (id: string): EventActor => ({ type: 'agent', id });

describe('recipientUserIds', () => {
  it('returns human authors and assignees', () => {
    expect(
      recipientUserIds([user('author'), user('assignee')], agent('bot')),
    ).toEqual(['author', 'assignee']);
  });

  it('excludes the initiator of the action', () => {
    expect(
      recipientUserIds([user('author'), user('assignee')], user('author')),
    ).toEqual(['assignee']);
  });

  it('ignores agents and null ids', () => {
    expect(
      recipientUserIds([agent('bot'), { type: 'user', id: null }], agent('x')),
    ).toEqual([]);
  });

  it('de-duplicates when author and assignee are the same user', () => {
    expect(
      recipientUserIds([user('same'), user('same')], agent('bot')),
    ).toEqual(['same']);
  });

  it('an agent initiator never suppresses a matching human id', () => {
    // agent tokenId could coincidentally equal a user id string — only
    // same-type-same-id is suppressed.
    expect(recipientUserIds([user('u1')], agent('u1'))).toEqual(['u1']);
  });
});

describe('TelegramNotifierService', () => {
  const sendMessage = jest.fn();

  /** Build a service over a Prisma mock; prefs default to "all on" (no rows). */
  function build(opts: {
    notificationPreferences?: Array<Record<string, unknown>>;
    telegramLinks?: Array<{ userId: string; chatId: string }>;
  }) {
    const prisma = {
      card: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          title: 'Задача',
          number: 5,
          boardId: 'b1',
          board: { name: 'ENG', seq: 1 },
          authorType: 'user',
          authorId: 'author',
          assigneeType: 'agent',
          assigneeId: 'tok1',
        }),
      },
      apiToken: { findUnique: jest.fn().mockResolvedValue({ name: 'Claude' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ name: 'Actor' }) },
      telegramLink: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            opts.telegramLinks ?? [{ userId: 'author', chatId: '999' }],
          ),
      },
      notificationPreferences: {
        findMany: jest.fn().mockResolvedValue(opts.notificationPreferences ?? []),
      },
    };
    const telegram = { sendMessage };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const service = new TelegramNotifierService(prisma as any, telegram as any);
    return { service, prisma };
  }

  const assignToAgent = (actorId: string): CardAssignedPayload => ({
    cardId: 'c1',
    actor: user(actorId),
    assignee: agent('tok1'),
  });

  beforeEach(() => sendMessage.mockClear());

  it('notifies the card author when a card is assigned to an agent', async () => {
    const { service } = build({});
    await service.handleAssigned(assignToAgent('someoneElse'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, text] = sendMessage.mock.calls[0];
    expect(chatId).toBe('999');
    expect(text).toContain('🤖');
    expect(text).toContain('Claude');
  });

  it('does not notify the author about their own agent-assignment', async () => {
    const { service } = build({});
    await service.handleAssigned(assignToAgent('author'));
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('respects the cardAssignedToAgent opt-out', async () => {
    const { service } = build({
      notificationPreferences: [
        { userId: 'author', cardAssignedToAgent: false },
      ],
    });
    await service.handleAssigned(assignToAgent('someoneElse'));
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('delivers when a different preference is disabled', async () => {
    const { service } = build({
      notificationPreferences: [{ userId: 'author', cardMoved: false }],
    });
    await service.handleAssigned(assignToAgent('someoneElse'));
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
