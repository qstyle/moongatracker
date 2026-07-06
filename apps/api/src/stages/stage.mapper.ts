import {
  BoardSummaryDto,
  StageDto,
  StageStatus,
} from '@moongatracker/shared-types';

type BoardRow = {
  id: string;
  projectId: string;
  name: string;
  seq: number;
  stageId: string | null;
  createdAt: Date;
  _count?: { cards: number };
};

type StageRow = {
  id: string;
  projectId: string;
  key: string | null;
  title: string;
  order: number;
  status: string;
  boards?: BoardRow[];
};

export function toBoardSummary(b: BoardRow): BoardSummaryDto {
  return {
    id: b.id,
    projectId: b.projectId,
    stageId: b.stageId,
    name: b.name,
    seq: b.seq,
    createdAt: b.createdAt.toISOString(),
  };
}

export function toStageDto(s: StageRow): StageDto {
  const boards = s.boards ?? [];
  return {
    id: s.id,
    projectId: s.projectId,
    key: s.key,
    title: s.title,
    order: s.order,
    status: s.status as StageStatus,
    boards: boards.map(toBoardSummary),
    cardCount: boards.reduce((n, b) => n + (b._count?.cards ?? 0), 0),
  };
}
