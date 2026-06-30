import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import { assertMembership } from '@moongatracker/data-access';
import { S3Service } from './s3.service';
import { AttachmentDto } from '@moongatracker/shared-types';
import { randomUUID } from 'crypto';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async presignUpload(
    cardId: string,
    filename: string,
    mimeType: string,
    size: number,
    userId: string,
  ): Promise<{ presignedUrl: string; attachmentId: string }> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { project: true },
    });
    if (!card) throw new NotFoundException('Card not found');
    await assertMembership(this.prisma, userId, card.project.orgId);

    const key = `attachments/${cardId}/${randomUUID()}-${filename}`;
    const presignedUrl = await this.s3.presignPut(key, mimeType, size);

    const attachment = await this.prisma.attachment.create({
      data: { cardId, key, filename, mimeType, size },
    });

    return { presignedUrl, attachmentId: attachment.id };
  }

  async listForCard(cardId: string, userId: string): Promise<AttachmentDto[]> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { project: true },
    });
    if (!card) throw new NotFoundException('Card not found');
    await assertMembership(this.prisma, userId, card.project.orgId);

    const attachments = await this.prisma.attachment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      attachments.map(async (a) => ({
        id: a.id,
        cardId: a.cardId,
        key: a.key,
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        createdAt: a.createdAt.toISOString(),
        url: await this.s3.presignGet(a.key),
      })),
    );
  }

  async remove(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { card: { include: { project: true } } },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    await assertMembership(this.prisma, userId, attachment.card.project.orgId);

    await this.s3.deleteObject(attachment.key);
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
  }
}
