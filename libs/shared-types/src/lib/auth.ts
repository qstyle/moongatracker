export interface AuthUser {
  id: string;
  username: string;
  name: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
