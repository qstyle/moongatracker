import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@moonga-studio/data-access';
import { AuthResponse, MeResponse } from '@moonga-studio/shared-types';
import { buildDefaultStages } from '../stages/default-stages';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private toResponse(user: UserRow): AuthResponse {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    };
  }

  async register(
    email: string,
    password: string,
    name?: string,
  ): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(password, 10);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name: name ?? null },
      });
      const projectName = name
        ? `${name}'s project`
        : email.split('@')[0] + "'s project";
      const project = await tx.project.create({
        data: {
          name: projectName,
          memberships: { create: { userId: user.id } },
        },
      });
      await tx.stage.createMany({ data: buildDefaultStages(project.id) });
      return { user };
    });

    return this.toResponse(user);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.toResponse(user);
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { telegramLink: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      telegram: user.telegramLink
        ? { connected: true, chatId: user.telegramLink.chatId }
        : { connected: false },
    };
  }

  async updateMe(userId: string, name: string): Promise<MeResponse> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });
    return this.getMe(userId);
  }
}
