import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

const DEFAULT_W = 240;
const DEFAULT_H = 140;

/**
 * Раскладывает ноды слева-направо через dagre. Возвращает новый массив нод
 * с обновлёнными позициями (верхний-левый угол), не мутируя исходные.
 */
export function layout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 });

  for (const n of nodes) {
    const w = n.width ?? DEFAULT_W;
    const h = n.height ?? DEFAULT_H;
    g.setNode(n.id, { width: w, height: h });
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const gn = g.node(n.id);
    if (!gn) return n;
    const w = n.width ?? DEFAULT_W;
    const h = n.height ?? DEFAULT_H;
    return {
      ...n,
      position: { x: gn.x - w / 2, y: gn.y - h / 2 },
    };
  });
}
