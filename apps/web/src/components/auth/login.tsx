import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoMark } from '@/components/brand/logo';
import { login } from '../../api/auth';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch {
      setError('Неверный логин или пароль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-xs border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <LogoMark className="size-6" />
          <span className="text-sm font-semibold tracking-tight">
            <span className="text-primary">m</span>oonga tracker
          </span>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <Label>логин</Label>
            <Input type="text" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <Label>пароль</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={busy || !password || !username}>войти</Button>
          <Button variant="link" asChild>
            <Link href="/register">Нет аккаунта? Зарегистрироваться</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
