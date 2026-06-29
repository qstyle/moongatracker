export interface ApiTokenDto {
  id: string;
  name: string;
  scope: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiTokenResponse extends ApiTokenDto {
  token: string; // plain token, показывается ОДИН РАЗ
}
