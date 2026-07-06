import { BoardSummaryDto } from './board.js';

export type StageStatus = 'not_started' | 'active' | 'done';

/** Card tallies by status bucket across a stage's boards (for its dashboard). */
export interface StageTaskCounts {
  open: number;
  inProgress: number;
  done: number;
}

export interface StageDto {
  id: string;
  projectId: string;
  key: string | null;
  title: string;
  order: number;
  status: StageStatus;
  /** Boards that belong to this stage. */
  boards: BoardSummaryDto[];
  /** Open / in-progress / done card counts across this stage's boards. */
  taskCounts: StageTaskCounts;
}
