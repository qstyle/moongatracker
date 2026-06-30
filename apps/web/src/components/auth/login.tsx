import { useState } from 'react';
import { RiTBoxLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    } catch {
      setError('Неверная почта или пароль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="w-full max-w-xs border border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <div className="flex size-6 items-center justify-center bg-primary text-primary-foreground">
            <RiTBoxLine className="size-4" />
          </div>
          <div className="text-sm font-semibold tracking-tight">moongatracker</div>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <Label>почта</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1">
            <Label>пароль</Label>
            <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={busy || !password}>войти</Button>
        </div>
      </form>
    </div>
  );
}
