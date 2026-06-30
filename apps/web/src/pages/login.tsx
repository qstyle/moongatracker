import { Login } from '../components/auth/login';

export function LoginPage() {
  // The existing Login component sets the token on success, which triggers
  // the auth store and App re-renders to the authenticated routes automatically.
  // No explicit navigate needed — kept for simplicity and to avoid changing Login.
  return <Login />;
}
