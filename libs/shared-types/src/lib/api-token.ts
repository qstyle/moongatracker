export interface ApiTokenDto {
  id: string;
  /** Owner of the token. A token grants access to all of this user's projects. */
  userId: string | null;
  /** Legacy single-project anchor; null for user-scoped (all-projects) tokens. */
  projectId: string | null;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateApiTokenResponse extends ApiTokenDto {
  token: string;
}
