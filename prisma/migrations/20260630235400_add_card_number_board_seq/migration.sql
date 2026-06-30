-- Add Board.seq (per-project ordinal) and Card.number (per-board sequence).
-- Additive + backfill so existing dev data is preserved (no reset).

-- 1. Add columns nullable first.
ALTER TABLE "Board" ADD COLUMN "seq" INTEGER;
ALTER TABLE "Card" ADD COLUMN "number" INTEGER;

-- 2. Backfill ordinals.
UPDATE "Board" b
SET "seq" = s.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY "projectId" ORDER BY "createdAt", "id") AS rn
  FROM "Board"
) s
WHERE b.id = s.id;

UPDATE "Card" c
SET "number" = s.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY "boardId" ORDER BY "createdAt", "order", "id") AS rn
  FROM "Card"
) s
WHERE c.id = s.id;

-- 3. Enforce NOT NULL + uniqueness.
ALTER TABLE "Board" ALTER COLUMN "seq" SET NOT NULL;
ALTER TABLE "Card" ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "Board_projectId_seq_key" ON "Board"("projectId", "seq");
CREATE UNIQUE INDEX "Card_boardId_number_key" ON "Card"("boardId", "number");
