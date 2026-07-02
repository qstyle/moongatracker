import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RiAlertLine, RiDeleteBin6Line } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { fetchProjects, updateProject, deleteProject, fetchProjectMembers, addMember, removeMember, updateMemberColor } from '../api/projects';
import { fetchBoards, deleteBoard } from '../api/boards';
import { fetchTokens, createToken, revokeToken } from '../api/api-tokens';
import { getCurrentUserId } from '../api/client';
import { MEMBER_COLOR_PALETTE } from '@moongatracker/shared-types';
import type { ApiTokenDto } from '@moongatracker/shared-types';
import { cn } from '../lib/utils';

type DeleteTarget = { kind: 'board'; id: string; name: string } | { kind: 'project'; id: string; name: string } | null;

export function SettingsPage() {
  const [projectName, setProjectName] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('project');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [revealToken, setRevealToken] = useState(false);
  const [connCopied, setConnCopied] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(['cards:read', 'cards:write']);
  const [creatingToken, setCreatingToken] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const currentUserId = getCurrentUserId();
  const isOwner = !!activeProject && activeProject.ownerId === currentUserId;

  async function handleChangeColor(userId: string, color: string) {
    if (!activeProject) return;
    try {
      await updateMemberColor(activeProject.id, userId, color);
      queryClient.invalidateQueries({ queryKey: ['members', activeProject.id] });
    } catch {
      /* ignore — owner-only / validation errors surface via 4xx */
    }
  }

  const { data: boards = [] } = useQuery({
    queryKey: ['boards', activeProject?.id],
    queryFn: () => fetchBoards(activeProject!.id),
    enabled: !!activeProject,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['members', activeProject?.id],
    queryFn: () => fetchProjectMembers(activeProject!.id),
    enabled: !!activeProject,
  });
  // Tokens are user-scoped (one token → all of the user's projects), so the
  // list no longer depends on the selected project.
  const { data: tokens = [], refetch: refetchTokens } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => fetchTokens(),
  });

  async function handleRenameProject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProject || !projectName.trim()) return;
    setSaving(true);
    try {
      await updateProject(activeProject.id, projectName.trim());
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectName('');
    } finally { setSaving(false); }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'board') {
      await deleteBoard(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['boards', activeProject?.id] });
    } else {
      await deleteProject(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
    setDeleteTarget(null);
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6 text-sm font-semibold uppercase tracking-wider">Настройки</div>

      {projects.length > 1 && tab !== 'tokens' && (
        <div className="mb-6 flex items-center gap-2">
          <Label>Проект:</Label>
          <div className="w-50">
          <Select value={activeProject?.id ?? ''} onValueChange={setActiveProjectId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="project">Проект</TabsTrigger>
          <TabsTrigger value="members">Участники</TabsTrigger>
          <TabsTrigger value="tokens">AI-агенты</TabsTrigger>
        </TabsList>

        <TabsContent value="project">
          <div className="max-w-sm space-y-8">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Текущее название: <div className="inline text-foreground">{activeProject?.name}</div>
              </div>
              <form onSubmit={handleRenameProject} className="flex gap-2">
                <Input placeholder="Новое название" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                <Button type="submit" disabled={saving || !projectName.trim()}>{saving ? '…' : 'Сохранить'}</Button>
              </form>
            </div>

            {boards.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Доски</div>
                <Table>
                  <TableBody>
                    {boards.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.name}</TableCell>
                        <TableCell style={{textAlign:"right"}}>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ kind: 'board', id: b.id, name: b.name })}>
                            Удалить
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="space-y-3 border-t border-destructive/30 pt-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-destructive">Опасная зона</div>
              <div className="text-sm text-muted-foreground">Удаление проекта необратимо — все доски, карточки и участники будут удалены.</div>
              <Button variant="outline" onClick={() => activeProject && setDeleteTarget({ kind: 'project', id: activeProject.id, name: activeProject.name })}>
                Удалить проект
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="max-w-md space-y-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Пригласить участника</div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!activeProject || !inviteEmail.trim()) return;
                setInviting(true);
                setInviteError('');
                try {
                  await addMember(activeProject.id, inviteEmail.trim());
                  setInviteEmail('');
                  queryClient.invalidateQueries({ queryKey: ['members', activeProject.id] });
                } catch (err: unknown) {
                  setInviteError(err instanceof Error ? err.message : 'Ошибка приглашения');
                } finally { setInviting(false); }
              }} className="flex gap-2">
                <Input type="email" placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                <Button type="submit" disabled={inviting || !inviteEmail.trim()}>{inviting ? '…' : 'Добавить'}</Button>
              </form>
              {inviteError && <div className="text-sm text-destructive">{inviteError}</div>}
            </div>

            {members.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Цвет</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Добавлен</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell>
                        {isOwner ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Изменить цвет участника"
                                className="size-4 rounded-full ring-1 ring-border ring-offset-1 ring-offset-background transition-transform hover:scale-110"
                                style={{ backgroundColor: m.color }}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="p-2">
                              <div className="grid grid-cols-6 gap-1.5">
                                {MEMBER_COLOR_PALETTE.map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    aria-label={c}
                                    onClick={() => handleChangeColor(m.userId, c)}
                                    className={cn(
                                      'size-5 rounded-full ring-1 ring-border transition-transform hover:scale-110',
                                      m.color.toLowerCase() === c.toLowerCase() && 'ring-2 ring-foreground',
                                    )}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div
                            className="size-4 rounded-full ring-1 ring-border"
                            style={{ backgroundColor: m.color }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{new Date(m.createdAt).toLocaleDateString('ru')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          if (!activeProject) return;
                          try { await removeMember(activeProject.id, m.userId); queryClient.invalidateQueries({ queryKey: ['members', activeProject.id] }); } catch { }
                        }}>Удалить</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tokens">
          {(() => {
            const hasActiveToken = tokens.some((t) => !t.revokedAt);
            const tokenValue = createdToken ?? '<ВАШ_ТОКЕН>';
            const connectionString = `npx -y @moongatracker/mcp
MOONGATRACKER_API_URL=${window.location.origin}
MOONGATRACKER_API_TOKEN=${tokenValue}`;
            const showConnection = !!createdToken || hasActiveToken;
            return (
          <div className="max-w-lg space-y-6">
            {createdToken && (
              <div className="space-y-2 rounded border border-amber-500/40 bg-amber-500/10 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">Новый токен — скопируйте, больше не будет показан</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 break-all rounded bg-muted px-2 py-1.5 text-sm text-foreground font-mono">
                    {revealToken ? createdToken : '•'.repeat(48)}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setRevealToken((v) => !v)}>
                    {revealToken ? 'Скрыть' : 'Показать'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(createdToken)}>Копировать</Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setCreatedToken(null); setRevealToken(false); }}>Закрыть</Button>
              </div>
            )}

            <div className="space-y-2 rounded border border-border/60 bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Строка подключения</div>
                {showConnection && (
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(connectionString); setConnCopied(true); setTimeout(() => setConnCopied(false), 1500); }}>
                    {connCopied ? 'Скопировано' : 'Копировать'}
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground">
                Добавьте MCP-сервер в своего агента (Claude Code / Cursor):
              </p>
              <pre className="overflow-x-auto rounded bg-muted px-2 py-1.5 text-xs font-mono text-foreground">{connectionString}</pre>
              {!createdToken && (
                <p className="text-xs text-muted-foreground">
                  {hasActiveToken
                    ? 'Значение токена показывается один раз при создании. Если потеряли — создайте новый ниже.'
                    : 'Создайте токен ниже — он подставится в строку подключения.'}
                </p>
              )}
              <p className="text-muted-foreground">
                Полная инструкция — <span className="text-foreground">docs/CONNECT_MCP.md</span>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Новый токен</div>
              <Input placeholder="Имя токена (например: claude-mcp)" value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} />
              <div className="flex flex-wrap gap-3">
                {(['cards:read', 'cards:write', 'comments:write'] as const).map((scope) => (
                  <div key={scope} className="flex items-center gap-1.5">
                    <Checkbox
                      id={scope}
                      checked={newTokenScopes.includes(scope)}
                      onCheckedChange={(checked) =>
                        setNewTokenScopes(checked ? [...newTokenScopes, scope] : newTokenScopes.filter((s) => s !== scope))
                      }
                    />
                    <Label htmlFor={scope}>{scope}</Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Токен даёт доступ ко всем вашим проектам.
              </p>
              <Button
                disabled={creatingToken || !newTokenName.trim() || newTokenScopes.length === 0}
                onClick={async () => {
                  setCreatingToken(true);
                  try {
                    const resp = await createToken(newTokenName.trim(), newTokenScopes);
                    setCreatedToken(resp.token);
                    setNewTokenName('');
                    await refetchTokens();
                  } finally { setCreatingToken(false); }
                }}
              >
                {creatingToken ? 'Создание…' : 'Создать токен'}
              </Button>
            </div>

            {tokens.some((t) => !t.revokedAt) && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Токены</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Скоупы</TableHead>
                      <TableHead>Последнее использование</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.filter((t: ApiTokenDto) => !t.revokedAt).map((t: ApiTokenDto) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell>{t.scopes.join(', ')}</TableCell>
                        <TableCell>{t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString('ru') : '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            await revokeToken(t.id);
                            await refetchTokens();
                          }}>Отозвать</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex items-center gap-2 text-destructive">
                <RiAlertLine size={16} />
                {deleteTarget?.kind === 'project' ? 'Удалить проект' : 'Удалить доску'}
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div>Вы собираетесь удалить <div className="inline font-semibold text-foreground">«{deleteTarget?.name}»</div>.</div>
                <div>{deleteTarget?.kind === 'project' ? 'Все доски, колонки, карточки и участники будут безвозвратно удалены.' : 'Все колонки и карточки этой доски будут безвозвратно удалены.'}</div>
                <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                  <RiDeleteBin6Line size={14} className="mt-0.5 shrink-0 text-destructive" />
                  <div className="text-xs text-destructive">Это действие нельзя отменить.</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
