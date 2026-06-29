import { useState } from 'react';
import { RiTBoxLine } from '@remixicon/react';
import { login } from '../../api/auth';

export function Login() {
  const [email, setEmail] = useState('admin@moongatracker.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      // token is set → the auth store notifies App, which swaps to the board.
    } catch {
      setError('Неверная почта или пароль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-xs border border-border bg-card"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <div className="flex size-6 items-center justify-center bg-primary text-primary-foreground">
            <RiTBoxLine className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            moongatracker
          </span>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              почта
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-border bg-background px-2.5 py-2 text-[12px] outline-none transition-colors focus:border-foreground/40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              пароль
            </span>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-border bg-background px-2.5 py-2 text-[12px] outline-none transition-colors focus:border-foreground/40"
            />
          </label>

          {error && <p className="text-[11px] text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={busy || !password}
            className="mt-1 bg-primary px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            войти
          </button>
        </div>
      </form>
    </div>
  );
}
