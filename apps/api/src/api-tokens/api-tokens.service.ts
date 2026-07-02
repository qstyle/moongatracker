import * as crypto from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';

function toDto(row: {
  id: string;
  userId: string | null;
  projectId: string | null;
  name: string;
  scopes: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}): ApiTokenDto {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    name: row.name,
    scopes: row.scopes,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class ApiTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mint a user-scoped token: it can access all of the owner's projects. */
  async create(
    userId: string,
    name: string,
    scopes: string[],
  ): Promise<CreateApiTokenResponse> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const row = await this.prisma.apiToken.create({
      data: { userId, name, tokenHash, scopes },
    });
    return { ...toDto(row), token: rawToken };
  }

  async listForUser(userId: string): Promise<ApiTokenDto[]> {
    const rows = await this.prisma.apiToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async revoke(userId: string, id: string): Promise<void> {
    const updated = await this.prisma.apiToken.updateMany({
      where: { id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new NotFoundException(`ApiToken ${id} not found`);
    }
  }
}
