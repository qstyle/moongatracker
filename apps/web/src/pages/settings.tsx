import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjects,
  updateProject,
  fetchProjectMembers,
  addMember,
  removeMember,
} from '../api/projects';
import { fetchTokens, createToken, revokeToken } from '../api/api-tokens';
import type { ApiTokenDto } from '@moongatracker/shared-types';
import { cn } from '../lib/utils';

type Tab = 'project' | 'members' | 'tokens';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('project');
  const [projectName, setProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>([
    'cards:read',
    'cards:write',
  ]);
  const [creatingToken, setCreatingToken] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });
  const activeProject = projects[0];

  const { data: members = [] } = useQuery({
    queryKey: ['members', activeProject?.id],
    queryFn: () => fetchProjectMembers(activeProject!.id),
    enabled: !!activeProject && tab === 'members',
  });

  const { data: tokens = [], refetch: refetchTokens } = useQuery({
    queryKey: ['tokens', activeProject?.id],
    queryFn: () => fetchTokens(activeProject!.id),
    enabled: !!activeProject && tab === 'tokens',
  });

  async function handleRenameProject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !projectName.trim()) return;
    setSaving(true);
    try {
      await updateProject(activeProject.id, projectName.trim());
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectName('');
    } finally {
      setSaving(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'project', label: 'Проект' },
    { key: 'members', label: 'Участники' },
    { key: 'tokens', label: 'AI-агенты' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-6 text-[13px] font-semibold uppercase tracking-wider">
        Настройки
      </h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-[11px] uppercase tracking-wider transition-colors',
              tab === t.key
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Project */}
      {tab === 'project' && (
        <div className="max-w-sm space-y-4">
          <p className="text-[12px] text-muted-foreground">
            Текущее название:{' '}
            <span className="text-foreground">{activeProject?.name}</span>
          </p>
          <form onSubmit={handleRenameProject} className="flex gap-2">
            <input
              className="flex-1 rounded border border-border bg-muted px-3 py-2 text-[12px] text-foreground outline-none"
              placeholder="Новое название"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving || !projectName.trim()}
              className="rounded bg-foreground px-4 py-2 text-[11px] text-background hover:opacity-80 disabled:opacity-40"
            >
              {saving ? '…' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Members */}
      {tab === 'members' && (
        <div className="max-w-md space-y-6">
          {/* Invite form */}
          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Пригласить участника
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!activeProject || !inviteEmail.trim()) return;
                setInviting(true);
                setInviteError('');
                try {
                  await addMember(activeProject.id, inviteEmail.trim());
                  setInviteEmail('');
                  queryClient.invalidateQueries({
                    queryKey: ['members', activeProject.id],
                  });
                } catch (err: unknown) {
                  setInviteError(
                    err instanceof Error ? err.message : 'Ошибка приглашения',
                  );
                } finally {
                  setInviting(false);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 rounded border border-border bg-muted px-3 py-2 text-[12px] text-foreground outline-none"
              />
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="rounded bg-foreground px-4 py-2 text-[11px] text-background hover:opacity-80 disabled:opacity-40"
              >
                {inviting ? '…' : 'Добавить'}
              </button>
            </form>
            {inviteError && (
              <p className="text-[11px] text-destructive">{inviteError}</p>
            )}
          </div>

          {/* Members table */}
          {members.length > 0 && (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-normal">Email</th>
                  <th className="pb-2 font-normal">Добавлен</th>
                  <th className="pb-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b border-border/50">
                    <td className="py-2">{m.email}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('ru')}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={async () => {
                          if (!activeProject) return;
                          try {
                            await removeMember(activeProject.id, m.userId);
                            queryClient.invalidateQueries({
                              queryKey: ['members', activeProject.id],
                            });
                          } catch {
                            // ignore
                          }
                        }}
                        className="text-[10px] text-destructive hover:opacity-80"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: AI-agents */}
      {tab === 'tokens' && (
        <div className="max-w-lg space-y-6">
          {/* One-time token display */}
          {createdToken && (
            <div className="rounded border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Скопируйте токен — больше не будет показан
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted px-2 py-1.5 text-[11px] text-foreground">
                  {createdToken}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdToken);
                  }}
                  className="shrink-0 rounded border border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Копировать
                </button>
              </div>
              <button
                onClick={() => setCreatedToken(null)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Закрыть
              </button>
            </div>
          )}

          {/* Create token form */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Новый токен
            </h2>
            <input
              className="w-full rounded border border-border bg-muted px-3 py-2 text-[12px] text-foreground outline-none"
              placeholder="Имя токена (например: claude-mcp)"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {(['cards:read', 'cards:write', 'comments:write'] as const).map(
                (scope) => (
                  <label
                    key={scope}
                    className="flex cursor-pointer items-center gap-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={newTokenScopes.includes(scope)}
                      onChange={(e) =>
                        setNewTokenScopes(
                          e.target.checked
                            ? [...newTokenScopes, scope]
                            : newTokenScopes.filter((s) => s !== scope),
                        )
                      }
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {scope}
                    </span>
                  </label>
                ),
              )}
            </div>
            <button
              disabled={
                creatingToken ||
                !newTokenName.trim() ||
                newTokenScopes.length === 0
              }
              onClick={async () => {
                if (!activeProject) return;
                setCreatingToken(true);
                try {
                  const resp = await createToken(
                    activeProject.id,
                    newTokenName.trim(),
                    newTokenScopes,
                  );
                  setCreatedToken(resp.token);
                  setNewTokenName('');
                  await refetchTokens();
                } finally {
                  setCreatingToken(false);
                }
              }}
              className="rounded bg-foreground px-4 py-2 text-[11px] text-background hover:opacity-80 disabled:opacity-40"
            >
              {creatingToken ? 'Создание…' : 'Создать токен'}
            </button>
          </div>

          {/* Tokens list */}
          {tokens.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Токены
              </h2>
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 font-normal">Имя</th>
                    <th className="pb-2 font-normal">Скоупы</th>
                    <th className="pb-2 font-normal">
                      Последнее использование
                    </th>
                    <th className="pb-2 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t: ApiTokenDto) => (
                    <tr
                      key={t.id}
                      className={cn(
                        'border-b border-border/50',
                        t.revokedAt ? 'opacity-40' : '',
                      )}
                    >
                      <td className="py-2">{t.name}</td>
                      <td className="py-2 text-[10px] text-muted-foreground">
                        {t.scopes.join(', ')}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {t.lastUsedAt
                          ? new Date(t.lastUsedAt).toLocaleDateString('ru')
                          : '—'}
                      </td>
                      <td className="py-2">
                        {!t.revokedAt && (
                          <button
                            onClick={async () => {
                              if (!activeProject) return;
                              await revokeToken(activeProject.id, t.id);
                              await refetchTokens();
                            }}
                            className="text-[10px] text-destructive hover:opacity-80"
                          >
                            Отозвать
                          </button>
                        )}
                        {t.revokedAt && (
                          <span className="text-[10px] text-muted-foreground">
                            Отозван
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
