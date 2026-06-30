import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRoute, useLocation } from 'wouter';
import { fetchProjects, createProject } from '../../api/projects';
import { fetchBoards, createBoard } from '../../api/boards';
import { logout } from '../../api/auth';
import type { ProjectDto } from '@moongatracker/shared-types';

function ProjectSection({
  project,
  activeBoardId,
}: {
  project: ProjectDto;
  activeBoardId?: string;
}) {
  const { data: boards = [] } = useQuery({
    queryKey: ['boards', project.id],
    queryFn: () => fetchBoards(project.id),
  });
  const [addingBoard, setAddingBoard] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="mb-2">
      {/* Project name as section header */}
      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
        {project.name}
      </div>

      {/* Board list */}
      {boards.map((board) => (
        <Link
          key={board.id}
          href={`/boards/${board.id}`}
          className={[
            'block rounded px-3 py-1.5 text-[12px] transition-colors',
            activeBoardId === board.id
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ].join(' ')}
        >
          {board.name}
        </Link>
      ))}

      {/* Add board */}
      {addingBoard ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const name = (fd.get('name') as string)?.trim();
            if (name) {
              await createBoard(project.id, name);
              queryClient.invalidateQueries({
                queryKey: ['boards', project.id],
              });
            }
            setAddingBoard(false);
          }}
          className="px-2 py-1"
        >
          <input
            autoFocus
            name="name"
            placeholder="Название доски"
            className="w-full rounded border border-border bg-muted px-2 py-1 text-[12px] outline-none"
            onKeyDown={(e) => e.key === 'Escape' && setAddingBoard(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setAddingBoard(true)}
          className="flex w-full items-center gap-1 rounded px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          + Новая доска
        </button>
      )}
    </div>
  );
}

export function Sidebar() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [addingProject, setAddingProject] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  const [, boardParams] = useRoute('/boards/:boardId');
  const activeBoardId = boardParams?.boardId;

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

      {/* Projects + Boards */}
      <nav className="flex-1 overflow-y-auto py-2">
        {projects.map((project) => (
          <ProjectSection
            key={project.id}
            project={project}
            activeBoardId={activeBoardId}
          />
        ))}

        {/* Add project */}
        {addingProject ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = (fd.get('name') as string)?.trim();
              if (name) {
                await createProject(name);
                queryClient.invalidateQueries({ queryKey: ['projects'] });
              }
              setAddingProject(false);
            }}
            className="px-2 py-1"
          >
            <input
              autoFocus
              name="name"
              placeholder="Название проекта"
              className="w-full rounded border border-border bg-muted px-2 py-1 text-[12px] outline-none"
              onKeyDown={(e) => e.key === 'Escape' && setAddingProject(false)}
            />
          </form>
        ) : (
          <button
            onClick={() => setAddingProject(true)}
            className="flex w-full items-center gap-1 rounded px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            + Новый проект
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
