/** Сводка связанной карточки канбана (резолвится сервером на чтении холста). */
export interface LinkedCardDto {
  id: string;
  boardId: string;
  title: string;
  columnTitle: string;
  priority: string | null;
}

/** data кастомной markdown-ноды React Flow. */
export interface CanvasNodeData {
  text: string;
  color?: string | null;
  /** id связанной карточки канбана (хранится в документе). */
  cardId?: string | null;
  /** Резолвится сервером на чтении; на запись не отправляется. */
  card?: LinkedCardDto | null;
  [key: string]: unknown;
}

/** Нода React Flow (совместима с @xyflow/react Node). */
export interface CanvasNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  width?: number | null;
  height?: number | null;
  data: CanvasNodeData;
  [key: string]: unknown;
}

/** Ребро React Flow (совместимо с @xyflow/react Edge). */
export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: { label?: string | null } & Record<string, unknown>;
  [key: string]: unknown;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

/** Весь холст проекта. */
export interface CanvasDoc {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport?: CanvasViewport;
}
