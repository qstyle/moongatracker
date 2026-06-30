import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOrgs, updateOrg, fetchOrgMembers } from '../api/orgs';
import { cn } from '../lib/utils';

type Tab = 'org' | 'members' | 'tokens';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('org');
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: orgs = [] } = useQuery({
    queryKey: ['orgs'],
    queryFn: fetchOrgs,
  });
  const activeOrg = orgs[0];

  const { data: members = [] } = useQuery({
    queryKey: ['members', activeOrg?.id],
    queryFn: () => fetchOrgMembers(activeOrg!.id),
    enabled: !!activeOrg && tab === 'members',
  });

  async function handleRenameOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg || !orgName.trim()) return;
    setSaving(true);
    try {
      await updateOrg(activeOrg.id, orgName.trim());
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      setOrgName('');
    } finally {
      setSaving(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'org', label: 'Организация' },
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

      {/* Tab: Organization */}
      {tab === 'org' && (
        <div className="max-w-sm space-y-4">
          <p className="text-[12px] text-muted-foreground">
            Текущее название:{' '}
            <span className="text-foreground">{activeOrg?.name}</span>
          </p>
          <form onSubmit={handleRenameOrg} className="flex gap-2">
            <input
              className="flex-1 rounded border border-border bg-muted px-3 py-2 text-[12px] text-foreground outline-none"
              placeholder="Новое название"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
            <button
              type="submit"
              disabled={saving || !orgName.trim()}
              className="rounded bg-foreground px-4 py-2 text-[11px] text-background hover:opacity-80 disabled:opacity-40"
            >
              {saving ? '…' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Members */}
      {tab === 'members' && (
        <div className="max-w-md space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Управление участниками будет доступно в Phase 4.
          </p>
          {members.length > 0 && (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-normal">Email</th>
                  <th className="pb-2 font-normal">Добавлен</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b border-border/50">
                    <td className="py-2">{m.email}</td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('ru')}
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
        <div className="max-w-md">
          <p className="text-[11px] text-muted-foreground">
            Управление AI-агентами будет доступно в Phase 4.
          </p>
        </div>
      )}
    </div>
  );
}
