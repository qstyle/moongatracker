import { useState } from 'react';
import { useLocation } from 'wouter';
import { register } from '../api/auth';

export function RegisterPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(email, password, name || undefined);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="flex w-[320px] flex-col gap-3">
        <h1 className="text-[13px] font-semibold uppercase tracking-wider">
          Регистрация
        </h1>
        {error && <p className="text-[12px] text-red-400">{error}</p>}
        <input
          type="text"
          placeholder="Имя (необязательно)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border border-border bg-muted px-3 py-2 text-[12px] text-foreground outline-none"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-border bg-muted px-3 py-2 text-[12px] text-foreground outline-none"
        />
        <input
          type="password"
          placeholder="Пароль (мин. 6 символов)"
          value={password}
          required
          minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-border bg-muted px-3 py-2 text-[12px] text-foreground outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-foreground px-3 py-2 text-[12px] text-background hover:opacity-80 disabled:opacity-40"
        >
          {loading ? 'Создание…' : 'Создать аккаунт'}
        </button>
        <a
          href="/login"
          className="text-center text-[11px] text-muted-foreground hover:text-foreground"
        >
          Уже есть аккаунт? Войти
        </a>
      </form>
    </div>
  );
}
