export interface LinkedCardDto {
  id: string;
  boardId: string;
  title: string;
  columnTitle: string;
  priority: string | null;
}

export interface CanvasNodeDto {
  id: string;
  projectId: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string | null;
  cardId: string | null;
  card: LinkedCardDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasEdgeDto {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string | null;
}

export interface CanvasDto {
  nodes: CanvasNodeDto[];
  edges: CanvasEdgeDto[];
}

export interface CreateCanvasNodeInput {
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string | null;
}

export interface UpdateCanvasNodeInput {
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string | null;
}

export interface CreateCanvasEdgeInput {
  sourceNodeId: string;
  targetNodeId: string;
  label?: string | null;
}

export interface UpdateCanvasEdgeInput {
  label?: string | null;
}

export interface CreateTaskFromNodeInput {
  boardId: string;
}

export interface LinkTaskInput {
  cardId: string;
}
