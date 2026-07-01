import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { register } from '../api/auth';

export function RegisterPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(username.trim(), password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3">
        <div className="text-sm font-semibold uppercase tracking-wider">Регистрация</div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <div className="flex flex-col gap-1">
          <Label>Логин</Label>
          <Input type="text" value={username} required minLength={3} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Пароль (мин. 6 символов)</Label>
          <Input type="password" value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Создание…' : 'Создать аккаунт'}</Button>
        <Button variant="link" asChild>
          <Link href="/login">Уже есть аккаунт? Войти</Link>
        </Button>
      </form>
    </div>
  );
}
