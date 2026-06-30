import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { assertMembership } from '@moongatracker/data-access';
import { ActivityDto } from '@moongatracker/shared-types';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    cardId: string,
    actorType: string,
    actorId: string,
    action: string,
    before?: Record<string, unknown> | null,
    after?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.prisma.activity.create({
      data: {
        cardId,
        actorType,
        actorId,
        action,
        before: (before ?? undefined) as never,
        after: (after ?? undefined) as never,
      },
    });
  }

  async listForCard(cardId: string, userId: string): Promise<ActivityDto[]> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { board: true },
    });
    if (!card) throw new NotFoundException('Card not found');
    await assertMembership(this.prisma, userId, card.board.projectId);

    const activities = await this.prisma.activity.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });

    return activities.map((a) => ({
      id: a.id,
      cardId: a.cardId,
      actorType: a.actorType as 'user' | 'agent',
      actorId: a.actorId,
      action: a.action,
      before: a.before as Record<string, unknown> | null,
      after: a.after as Record<string, unknown> | null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async revert(activityId: string, userId: string): Promise<void> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { card: { include: { board: true } } },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    await assertMembership(this.prisma, userId, activity.card.board.projectId);

    if (!activity.before || activity.action === 'revert') return;

    const before = activity.before as Record<string, unknown>;
    await this.prisma.card.update({
      where: { id: activity.cardId },
      data: {
        ...(before['title'] !== undefined && {
          title: before['title'] as string,
        }),
        ...(before['body'] !== undefined && {
          body: before['body'] as string | null,
        }),
        ...(before['priority'] !== undefined && {
          priority: before['priority'] as string | null,
        }),
        ...(before['columnId'] !== undefined && {
          columnId: before['columnId'] as string,
        }),
      },
    });

    // Record the revert itself (not traced further)
    await this.prisma.activity.create({
      data: {
        cardId: activity.cardId,
        actorType: 'user',
        actorId: userId,
        action: 'revert',
        after: { revertedActivityId: activityId },
      },
    });
  }
}
