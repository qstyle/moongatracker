-- Canvas v2: switch from normalized CanvasNode/CanvasEdge to a single JSON document per project.
DROP TABLE IF EXISTS "CanvasEdge";
DROP TABLE IF EXISTS "CanvasNode";

CREATE TABLE "Canvas" (
  "projectId" TEXT NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Canvas_pkey" PRIMARY KEY ("projectId")
);

ALTER TABLE "Canvas" ADD CONSTRAINT "Canvas_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
