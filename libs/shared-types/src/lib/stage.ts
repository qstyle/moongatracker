import { BoardSummaryDto } from './board.js';

export type StageStatus = 'not_started' | 'active' | 'done';

export interface StageDto {
  id: string;
  projectId: string;
  key: string | null;
  title: string;
  order: number;
  status: StageStatus;
  /** Boards that belong to this stage. */
  boards: BoardSummaryDto[];
  /** Total cards across this stage's boards (for the stage dashboard). */
  cardCount: number;
}
