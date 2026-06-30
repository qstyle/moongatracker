import * as crypto from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@moongatracker/data-access';
import {
  ApiTokenDto,
  CreateApiTokenResponse,
} from '@moongatracker/shared-types';

function toDto(row: {
  id: string;
  projectId: string;
  name: string;
  scopes: string[];
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}): ApiTokenDto {
  return {
    id: row.id,
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

  async create(
    projectId: string,
    name: string,
    scopes: string[],
  ): Promise<CreateApiTokenResponse> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const row = await this.prisma.apiToken.create({
      data: { projectId, name, tokenHash, scopes },
    });
    return { ...toDto(row), token: rawToken };
  }

  async list(projectId: string): Promise<ApiTokenDto[]> {
    const rows = await this.prisma.apiToken.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDto);
  }

  async revoke(projectId: string, id: string): Promise<void> {
    const updated = await this.prisma.apiToken.updateMany({
      where: { id, projectId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new NotFoundException(`ApiToken ${id} not found`);
    }
  }
}
