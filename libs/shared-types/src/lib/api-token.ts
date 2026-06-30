export interface ApiTokenDto {
  id: string;
  orgId: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateApiTokenResponse extends ApiTokenDto {
  token: string;
}
