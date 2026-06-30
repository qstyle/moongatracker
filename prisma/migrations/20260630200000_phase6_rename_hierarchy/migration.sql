-- Phase 6: Rename Organization→Project, Project(board)→Board
-- Order matters: rename board table first to avoid naming conflict

-- Step 1: Rename board table "Project" → "Board" (before Organization is renamed to Project)
ALTER TABLE "Project" RENAME TO "Board";

-- Step 2: Rename "Organization" → "Project"
ALTER TABLE "Organization" RENAME TO "Project";

-- Step 3: Rename Membership.orgId → projectId
ALTER TABLE "Membership" RENAME COLUMN "orgId" TO "projectId";
DROP INDEX IF EXISTS "Membership_orgId_userId_key";
CREATE UNIQUE INDEX "Membership_projectId_userId_key" ON "Membership"("projectId", "userId");

-- Step 4: Rename ApiToken.orgId → projectId
ALTER TABLE "ApiToken" RENAME COLUMN "orgId" TO "projectId";

-- Step 5: Rename Board.orgId → projectId (board's FK to Organization→Project)
ALTER TABLE "Board" RENAME COLUMN "orgId" TO "projectId";

-- Step 6: Column.projectId → boardId
ALTER TABLE "Column" RENAME COLUMN "projectId" TO "boardId";

-- Step 7: Card.projectId → boardId
ALTER TABLE "Card" RENAME COLUMN "projectId" TO "boardId";

-- Step 8: Fix FK constraint names

-- Membership
ALTER TABLE "Membership" DROP CONSTRAINT IF EXISTS "Membership_orgId_fkey";
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ApiToken
ALTER TABLE "ApiToken" DROP CONSTRAINT IF EXISTS "ApiToken_orgId_fkey";
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Board (was "Project_orgId_fkey")
ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Project_orgId_fkey";
ALTER TABLE "Board" ADD CONSTRAINT "Board_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Column
ALTER TABLE "Column" DROP CONSTRAINT IF EXISTS "Column_projectId_fkey";
ALTER TABLE "Column" ADD CONSTRAINT "Column_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Card
ALTER TABLE "Card" DROP CONSTRAINT IF EXISTS "Card_projectId_fkey";
ALTER TABLE "Card" ADD CONSTRAINT "Card_boardId_fkey"
  FOREIGN KEY ("boardId") REFERENCES "Board"(id) ON DELETE CASCADE ON UPDATE CASCADE;
