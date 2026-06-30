import { useQuery } from '@tanstack/react-query';
import { ActorDto } from '@moongatracker/shared-types';
import { fetchBoardActors } from '../api/boards';

const AGENT_COLOR = '#f59e0b';

export interface ActorsLookup {
  actors: ActorDto[];
  /** Enrich a card's author/assignee (name is null in the board payload) with
   * the name/color from the board's actor list. Falls back gracefully when the
   * actor was removed (deleted member / revoked token). */
  resolve: (actor: ActorDto | null) => ActorDto | null;
}

export function useBoardActors(boardId: string): ActorsLookup {
  const { data: actors = [] } = useQuery({
    queryKey: ['board-actors', boardId],
    queryFn: () => fetchBoardActors(boardId),
    enabled: !!boardId,
  });

  const byId = new Map(actors.filter((a) => a.id).map((a) => [a.id, a]));

  function resolve(actor: ActorDto | null): ActorDto | null {
    if (!actor) return null;
    const found = actor.id ? byId.get(actor.id) : undefined;
    if (found) return found;
    return {
      ...actor,
      name: actor.name ?? (actor.type === 'agent' ? 'Агент' : 'Пользователь'),
      color: actor.color ?? (actor.type === 'agent' ? AGENT_COLOR : '#64748b'),
    };
  }

  return { actors, resolve };
}
