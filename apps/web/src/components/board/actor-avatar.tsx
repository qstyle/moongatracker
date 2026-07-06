import { ActorDto } from '@moonga-studio/shared-types';
import { RiRobot2Line } from '@remixicon/react';

const SIZES = {
  xs: { box: 'size-4', text: 'text-[9px]', icon: 10 },
  sm: { box: 'size-5', text: 'text-[10px]', icon: 12 },
} as const;

function initials(name: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Round avatar for a card actor: initials for users, robot icon for agents.
 * Expects an actor already enriched with name/color (see useBoardActors). */
export function ActorAvatar({
  actor,
  size = 'sm',
}: {
  actor: ActorDto;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  const color = actor.color ?? '#64748b';
  const label =
    actor.name ?? (actor.type === 'agent' ? 'Агент' : 'Пользователь');

  return (
    <div
      title={`${actor.type === 'agent' ? 'Агент' : 'Участник'}: ${label}`}
      className={`flex ${s.box} shrink-0 items-center justify-center rounded-full font-semibold text-white ${s.text}`}
      style={{ backgroundColor: color }}
    >
      {actor.type === 'agent' ? (
        <RiRobot2Line size={s.icon} />
      ) : (
        initials(actor.name)
      )}
    </div>
  );
}
