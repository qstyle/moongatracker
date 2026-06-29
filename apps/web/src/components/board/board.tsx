import { useState } from 'react';
import { BoardDto, CardDto } from '@moongatracker/shared-types';
import { RiTBoxLine } from '@remixicon/react';
import { VIEWS, ViewId } from '../../lib/views';
import { Column } from './column';
import { ViewSwitch } from './view-switch';
import { CardDialog } from './card-dialog';

const GRID_BG: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px),' +
    'linear-gradient(90deg, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)',
  backgroundSize: '28px 28px',
  backgroundPosition: '-1px -1px',
};

export function Board({
  board,
  onChanged,
}: {
  board: BoardDto;
  onChanged: () => void;
}) {
  const [view, setView] = useState<ViewId>('all');
  const [selected, setSelected] = useState<CardDto | null>(null);

  const def = VIEWS.find((v) => v.id === view) ?? VIEWS[0];
  const columns = def.columns
    ? board.columns.filter((c) => def.columns!.includes(c.key))
    : board.columns;
  const total = board.columns.reduce((n, c) => n + c.cards.length, 0);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-6 items-center justify-center bg-primary text-primary-foreground">
            <RiTBoxLine className="size-4" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm font-semibold tracking-tight">
              moongatracker
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-[12px] text-muted-foreground">
              {board.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">
            {total} задач
          </span>
          <ViewSwitch value={view} onChange={setView} />
        </div>
      </header>

      <main
        className="flex flex-1 items-start gap-5 overflow-x-auto px-5 py-6"
        style={GRID_BG}
      >
        {columns.map((column, i) => (
          <Column
            key={column.id}
            column={column}
            index={i}
            boardId={board.id}
            onChanged={onChanged}
            onSelectCard={setSelected}
          />
        ))}
      </main>

      {selected && (
        <CardDialog
          card={selected}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
