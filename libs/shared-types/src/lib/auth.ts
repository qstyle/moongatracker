export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
