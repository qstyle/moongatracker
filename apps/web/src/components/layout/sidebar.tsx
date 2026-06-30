import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRoute, useLocation } from 'wouter';
import { fetchOrgs } from '../../api/orgs';
import { fetchProjects, createProject } from '../../api/projects';
import { logout } from '../../api/auth';

export function Sidebar() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const { data: orgs = [] } = useQuery({
    queryKey: ['orgs'],
    queryFn: fetchOrgs,
  });

  const activeOrg = orgs[0];

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', activeOrg?.id],
    queryFn: () => fetchProjects(activeOrg!.id),
    enabled: !!activeOrg,
  });

  const [, boardParams] = useRoute('/projects/:projectId');
  const activeProjectId = boardParams?.projectId;

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrg || !newProjectName.trim()) return;
    await createProject(activeOrg.id, newProjectName.trim());
    setNewProjectName('');
    setCreating(false);
    queryClient.invalidateQueries({ queryKey: ['projects', activeOrg.id] });
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="flex h-dvh w-[220px] shrink-0 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="border-b border-border px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground">
          Moongatracker
        </span>
      </div>

      {/* Org name */}
      {activeOrg && (
        <div className="px-4 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {activeOrg.name}
          </span>
        </div>
      )}

      {/* Projects list */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className={[
              'block rounded px-3 py-1.5 text-[12px] transition-colors',
              activeProjectId === p.id
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            ].join(' ')}
          >
            {p.name}
          </Link>
        ))}

        {/* New project */}
        {creating ? (
          <form onSubmit={handleCreateProject} className="px-1 py-1">
            <input
              autoFocus
              className="w-full rounded border border-border bg-muted px-2 py-1 text-[12px] text-foreground outline-none"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setCreating(false)}
            />
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-1 flex w-full items-center gap-1 rounded px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <span>+</span> Новый проект
          </button>
        )}
      </nav>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-border px-2 py-2">
        <Link
          href="/settings"
          className="block rounded px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          ⚙ Настройки
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full rounded px-3 py-1.5 text-left text-[11px] text-muted-foreground hover:text-foreground"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
