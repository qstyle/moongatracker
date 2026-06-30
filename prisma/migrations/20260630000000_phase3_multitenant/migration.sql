-- Phase 3: Organization / Project / Column / Card multitenant model
-- Handles both empty DB and DB with existing Board/Column/Card data.
-- All steps are ordered so we capture needed data before dropping columns.

-- ─────────────────────────────────────────────
-- 1. CREATE new top-level tables (no data yet)
-- ─────────────────────────────────────────────

CREATE TABLE "Organization" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id"        TEXT         NOT NULL,
    "orgId"     TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id"        TEXT         NOT NULL,
    "orgId"     TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────
-- 2. Capture boardId+key→columnId mapping BEFORE we drop 'key' from Column
-- ─────────────────────────────────────────────

CREATE TEMP TABLE __col_key_map AS
SELECT id AS column_id, "boardId" AS board_id, "key" AS col_key
FROM "Column";

-- ─────────────────────────────────────────────
-- 3. Migrate Board rows → Project rows; add all users as members of demo org
-- ─────────────────────────────────────────────

DO $$
DECLARE
    v_demo_org_id TEXT;
    v_board       RECORD;
    v_user        RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM "Board" LIMIT 1) THEN

        v_demo_org_id := gen_random_uuid()::text;
        INSERT INTO "Organization" ("id", "name", "createdAt")
        VALUES (v_demo_org_id, 'Demo Organisation', NOW());

        FOR v_board IN SELECT id, name, "createdAt" FROM "Board" LOOP
            INSERT INTO "Project" ("id", "orgId", "name", "createdAt")
            VALUES (v_board.id, v_demo_org_id, v_board.name, v_board."createdAt");
        END LOOP;

        FOR v_user IN SELECT id FROM "User" LOOP
            INSERT INTO "Membership" ("id", "orgId", "userId", "createdAt")
            VALUES (gen_random_uuid()::text, v_demo_org_id, v_user.id, NOW());
        END LOOP;

    END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4. ALTER TABLE "Column"
--    Add projectId, populate, then drop boardId / key / unique index
-- ─────────────────────────────────────────────

ALTER TABLE "Column" ADD COLUMN "projectId" TEXT;

UPDATE "Column" c
SET "projectId" = m.board_id
FROM __col_key_map m
WHERE m.column_id = c.id;

ALTER TABLE "Column" ALTER COLUMN "projectId" SET NOT NULL;

ALTER TABLE "Column" DROP CONSTRAINT IF EXISTS "Column_boardId_fkey";
DROP INDEX IF EXISTS "Column_boardId_key_key";
ALTER TABLE "Column" DROP COLUMN "boardId";
ALTER TABLE "Column" DROP COLUMN "key";

-- ─────────────────────────────────────────────
-- 5. ALTER TABLE "Card"
--    Add projectId, columnId, new author/priority/assignee columns
--    Populate from old data, then drop old columns, rename new ones
-- ─────────────────────────────────────────────

-- Add new columns (all nullable initially)
ALTER TABLE "Card" ADD COLUMN "projectId"      TEXT;
ALTER TABLE "Card" ADD COLUMN "columnId"       TEXT;
ALTER TABLE "Card" ADD COLUMN "priority_new"   TEXT;
ALTER TABLE "Card" ADD COLUMN "authorType_new" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE "Card" ADD COLUMN "authorId_new"   TEXT NOT NULL DEFAULT '';
ALTER TABLE "Card" ADD COLUMN "assigneeType"   TEXT;
ALTER TABLE "Card" ADD COLUMN "assigneeId"     TEXT;

-- Populate projectId (boards were copied to projects with same id)
UPDATE "Card" SET "projectId" = "boardId";

-- Populate columnId using the captured mapping (boardId + columnKey → column.id)
UPDATE "Card" c
SET "columnId" = m.column_id
FROM __col_key_map m
WHERE m.board_id = c."boardId"
  AND m.col_key  = c."columnKey";

-- Map priority Int → String
UPDATE "Card"
SET "priority_new" = CASE "priority"
    WHEN 0 THEN NULL
    WHEN 1 THEN 'low'
    WHEN 2 THEN 'medium'
    WHEN 3 THEN 'high'
    ELSE 'medium'
END;

-- Safety: assign orphaned cards (columnId still NULL = no matching column for their boardId+columnKey)
-- to the first column (by order) in their project, so the SET NOT NULL below never fails.
UPDATE "Card" SET "columnId" = (
    SELECT c.id FROM "Column" c WHERE c."projectId" = "Card"."projectId" ORDER BY c."order" ASC LIMIT 1
) WHERE "columnId" IS NULL;

-- Make projectId / columnId NOT NULL (safe: either populated or table is empty)
ALTER TABLE "Card" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "Card" ALTER COLUMN "columnId"  SET NOT NULL;

-- Drop old FK constraints
ALTER TABLE "Card" DROP CONSTRAINT IF EXISTS "Card_boardId_fkey";

-- Drop old columns (authorType and authorId do not exist in the pre-migration schema)
ALTER TABLE "Card" DROP COLUMN "boardId";
ALTER TABLE "Card" DROP COLUMN "columnKey";
ALTER TABLE "Card" DROP COLUMN "priority";

-- Rename staging columns to final names
ALTER TABLE "Card" RENAME COLUMN "priority_new"   TO "priority";
ALTER TABLE "Card" RENAME COLUMN "authorType_new" TO "authorType";
ALTER TABLE "Card" RENAME COLUMN "authorId_new"   TO "authorId";

-- ─────────────────────────────────────────────
-- 6. ALTER TABLE "ApiToken"
--    Add orgId (from membership lookup), scopes (copy from scope), revokedAt
--    Then drop userId and scope
-- ─────────────────────────────────────────────

ALTER TABLE "ApiToken" ADD COLUMN "orgId"     TEXT;
ALTER TABLE "ApiToken" ADD COLUMN "scopes"    TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "ApiToken" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- Populate scopes from scope
UPDATE "ApiToken" SET "scopes" = "scope";

-- Populate orgId: find the first org the token's user belongs to
UPDATE "ApiToken" t
SET "orgId" = (
    SELECT m."orgId"
    FROM "Membership" m
    WHERE m."userId" = t."userId"
    LIMIT 1
);

-- For tokens whose user has no membership (edge case: org wasn't created because
-- Board table was empty), assign the first org if one exists.
UPDATE "ApiToken" t
SET "orgId" = (SELECT id FROM "Organization" LIMIT 1)
WHERE t."orgId" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization");

-- If still NULL (no org at all) set a placeholder so we can make NOT NULL
-- This only happens on a completely empty DB with ApiToken rows — shouldn't occur,
-- but we handle it defensively by creating a fallback org.
DO $$
DECLARE
    v_fallback_org TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM "ApiToken" WHERE "orgId" IS NULL) THEN
        v_fallback_org := gen_random_uuid()::text;
        INSERT INTO "Organization" ("id", "name", "createdAt")
        VALUES (v_fallback_org, 'Fallback Organisation', NOW());

        UPDATE "ApiToken" SET "orgId" = v_fallback_org WHERE "orgId" IS NULL;
    END IF;
END $$;

ALTER TABLE "ApiToken" ALTER COLUMN "orgId" SET NOT NULL;

-- Drop old columns
ALTER TABLE "ApiToken" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "ApiToken" DROP COLUMN IF EXISTS "scope";

-- ─────────────────────────────────────────────
-- 7. DROP obsolete tables (FK constraints cascade first)
-- ─────────────────────────────────────────────

ALTER TABLE "CardLabel" DROP CONSTRAINT IF EXISTS "CardLabel_cardId_fkey";
ALTER TABLE "CardLabel" DROP CONSTRAINT IF EXISTS "CardLabel_labelId_fkey";
ALTER TABLE "Label"     DROP CONSTRAINT IF EXISTS "Label_boardId_fkey";

DROP TABLE IF EXISTS "CardLabel";
DROP TABLE IF EXISTS "Label";
DROP TABLE IF EXISTS "Board";

-- ─────────────────────────────────────────────
-- 8. Drop User.role column
-- ─────────────────────────────────────────────

ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

-- ─────────────────────────────────────────────
-- 9. Add all FK constraints for new tables and updated tables
-- ─────────────────────────────────────────────

-- Membership → Organization
ALTER TABLE "Membership"
    ADD CONSTRAINT "Membership_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Membership → User
ALTER TABLE "Membership"
    ADD CONSTRAINT "Membership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Project → Organization
ALTER TABLE "Project"
    ADD CONSTRAINT "Project_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Column → Project
ALTER TABLE "Column"
    ADD CONSTRAINT "Column_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Card → Project
ALTER TABLE "Card"
    ADD CONSTRAINT "Card_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Card → Column (Restrict so you can't delete a column that still has cards)
ALTER TABLE "Card"
    ADD CONSTRAINT "Card_columnId_fkey"
    FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ApiToken → Organization
ALTER TABLE "ApiToken"
    ADD CONSTRAINT "ApiToken_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Comment → Card (already exists, but re-add in case it was dropped)
-- (The original FK was created in an earlier migration and is still valid.)

-- ─────────────────────────────────────────────
-- 10. Unique index on Membership(orgId, userId)
-- ─────────────────────────────────────────────

CREATE UNIQUE INDEX "Membership_orgId_userId_key"
    ON "Membership"("orgId", "userId");

-- ─────────────────────────────────────────────
-- 11. Cleanup temp table
-- ─────────────────────────────────────────────

DROP TABLE IF EXISTS __col_key_map;
