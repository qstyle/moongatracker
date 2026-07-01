import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@moongatracker/data-access';
import { AuthResponse } from '@moongatracker/shared-types';

interface UserRow {
  id: string;
  username: string;
  name: string | null;
  passwordHash: string;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private toResponse(user: UserRow): AuthResponse {
    const accessToken = this.jwt.sign({ sub: user.id, username: user.username });
    return {
      accessToken,
      user: { id: user.id, username: user.username, name: user.name },
    };
  }

  async register(username: string, password: string): Promise<AuthResponse> {
    const uname = normalizeUsername(username);
    const existing = await this.prisma.user.findUnique({
      where: { username: uname },
    });
    if (existing) throw new ConflictException('Username already in use');

    const passwordHash = await bcrypt.hash(password, 10);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: uname, passwordHash, name: null },
      });
      await tx.project.create({
        data: {
          name: `${uname}'s project`,
          memberships: { create: { userId: user.id } },
        },
      });
      return { user };
    });

    return this.toResponse(user);
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const uname = normalizeUsername(username);
    const user = await this.prisma.user.findUnique({
      where: { username: uname },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.toResponse(user);
  }
}
