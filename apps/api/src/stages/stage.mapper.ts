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
  return {
    id: s.id,
    projectId: s.projectId,
    key: s.key,
    title: s.title,
    order: s.order,
    status: s.status as StageStatus,
    boards: (s.boards ?? []).map(toBoardSummary),
  };
}
