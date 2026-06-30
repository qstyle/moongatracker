import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';

function toDto(row: {
  id: string;
  name: string;
  scope: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
}): ApiTokenDto {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class ApiTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    name: string,
    scope: string[],
  ): Promise<CreateApiTokenResponse> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const row = await this.prisma.apiToken.create({
      data: { userId, name, tokenHash, scope },
    });
    return { ...toDto(row), token: rawToken };
  }

  async list(userId: string): Promise<ApiTokenDto[]> {
    const rows = await this.prisma.apiToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async revoke(userId: string, id: string): Promise<void> {
    await this.prisma.apiToken.deleteMany({ where: { id, userId } });
  }
}
