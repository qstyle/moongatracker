import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRoute, useLocation } from 'wouter';
import { RiFolderOpenLine, RiKanbanView, RiBookOpenLine, RiLayoutMasonryLine, RiRouteLine, RiSunLine, RiMoonLine } from '@remixicon/react';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/use-theme';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { fetchProjects, createProject } from '../../api/projects';
import { fetchBoards, createBoard } from '../../api/boards';
import { logout } from '../../api/auth';
import type { ProjectDto } from '@moongatracker/shared-types';

function ProjectSection({ project, activeBoardId }: { project: ProjectDto; activeBoardId?: string }) {
  const { data: boards = [] } = useQuery({
    queryKey: ['boards', project.id],
    queryFn: () => fetchBoards(project.id),
  });
  const [addingBoard, setAddingBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const queryClient = useQueryClient();
  const [roadmapActive] = useRoute(`/projects/${project.id}/roadmap`);
  const [wikiActive] = useRoute(`/projects/${project.id}/wiki`);
  const [canvasActive] = useRoute(`/projects/${project.id}/canvas`);

  async function submitBoard() {
    const name = boardName.trim();
    if (!name) return;
    await createBoard(project.id, name);
    setBoardName('');
    setAddingBoard(false);
    queryClient.invalidateQueries({ queryKey: ['boards', project.id] });
  }

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <RiFolderOpenLine size={14} className="shrink-0 text-muted-foreground" />
        <div className="truncate text-sm font-semibold text-foreground">{project.name}</div>
      </div>
      <div className="ml-3 border-l border-border/40 pl-2">
        <Link
          href={`/projects/${project.id}/roadmap`}
          className={[
            'flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
            roadmapActive
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ].join(' ')}
        >
          <RiRouteLine size={11} className="shrink-0" />
          <div className="truncate">Роадмап</div>
        </Link>
        <Link
          href={`/projects/${project.id}/wiki`}
          className={[
            'flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
            wikiActive
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ].join(' ')}
        >
          <RiBookOpenLine size={11} className="shrink-0" />
          <div className="truncate">Вики</div>
        </Link>
        <Link
          href={`/projects/${project.id}/canvas`}
          className={[
            'flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
            canvasActive
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          ].join(' ')}
        >
          <RiLayoutMasonryLine size={11} className="shrink-0" />
          <div className="truncate">Холст</div>
        </Link>
        {boards.map((board) => (
          <Link
            key={board.id}
            href={`/boards/${board.id}`}
            className={[
              'flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors',
              activeBoardId === board.id
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            ].join(' ')}
          >
            <RiKanbanView size={11} className="shrink-0" />
            <div className="truncate">{board.name}</div>
          </Link>
        ))}
        {addingBoard ? (
          <div className="flex flex-col gap-1.5 py-1 pr-1">
            <Input
              autoFocus
              value={boardName}
              placeholder="Название доски"
              onChange={(e) => setBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitBoard();
                if (e.key === 'Escape') { setBoardName(''); setAddingBoard(false); }
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={submitBoard} disabled={!boardName.trim()}>Создать</Button>
              <Button variant="ghost" size="sm" onClick={() => { setBoardName(''); setAddingBoard(false); }}>Отмена</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setAddingBoard(true)}>+ Новая доска</Button>
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
} = {}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [addingProject, setAddingProject] = useState(false);
  const [projectName, setProjectName] = useState('');

  const { theme, toggle } = useTheme();
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const [, boardParams] = useRoute('/boards/:boardId');
  const activeBoardId = boardParams?.boardId;

  async function submitProject() {
    const name = projectName.trim();
    if (!name) return;
    await createProject(name);
    setProjectName('');
    setAddingProject(false);
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  }

  return (
    <div
      // Off-canvas drawer on mobile (fixed + slide), static column on md+.
      className={[
        'flex h-dvh w-55 shrink-0 flex-col border-r border-border bg-background',
        'fixed inset-y-0 left-0 z-50 transition-transform md:static md:z-auto md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      // On mobile, close the drawer after navigating via any link.
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) onClose?.();
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-1.5">
          <LogoMark className="size-5" />
          <span className="text-xs font-semibold tracking-tight text-foreground">
            <span className="text-primary">m</span>oonga tracker
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          onClick={toggle}
        >
          {theme === 'dark' ? <RiSunLine /> : <RiMoonLine />}
        </Button>
      </div>
      <div className="flex-1 overflow-hidden"><ScrollArea className="h-full py-2">
        {projects.map((project) => (
          <ProjectSection key={project.id} project={project} activeBoardId={activeBoardId} />
        ))}
        {addingProject ? (
          <div className="flex flex-col gap-1.5 px-2 py-1">
            <Input
              autoFocus
              value={projectName}
              placeholder="Название проекта"
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitProject();
                if (e.key === 'Escape') { setProjectName(''); setAddingProject(false); }
              }}
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={submitProject} disabled={!projectName.trim()}>Создать</Button>
              <Button variant="ghost" size="sm" onClick={() => { setProjectName(''); setAddingProject(false); }}>Отмена</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setAddingProject(true)}>+ Новый проект</Button>
        )}
      </ScrollArea></div>
      <Separator />
      <div className="space-y-0.5 px-2 py-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">⚙ Настройки</Link>
        </Button>
<Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/login'); }}>Выйти</Button>
      </div>
    </div>
  );
}
