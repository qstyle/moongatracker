import { TelegramLinkStatus } from './telegram.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

/** Response of GET /api/auth/me — the current user plus integration status. */
export interface MeResponse extends AuthUser {
  telegram: TelegramLinkStatus | null;
}
