CREATE TABLE "CanvasNode" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "width" DOUBLE PRECISION NOT NULL DEFAULT 240,
  "height" DOUBLE PRECISION NOT NULL DEFAULT 120,
  "color" TEXT,
  "cardId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CanvasNode_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CanvasEdge" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "sourceNodeId" TEXT NOT NULL,
  "targetNodeId" TEXT NOT NULL,
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CanvasEdge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CanvasNode_cardId_key" ON "CanvasNode"("cardId");
CREATE INDEX "CanvasNode_projectId_idx" ON "CanvasNode"("projectId");
CREATE INDEX "CanvasEdge_projectId_idx" ON "CanvasEdge"("projectId");
CREATE INDEX "CanvasEdge_sourceNodeId_idx" ON "CanvasEdge"("sourceNodeId");
CREATE INDEX "CanvasEdge_targetNodeId_idx" ON "CanvasEdge"("targetNodeId");
ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "CanvasNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "CanvasNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
