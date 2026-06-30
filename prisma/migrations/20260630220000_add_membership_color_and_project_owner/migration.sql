-- AlterTable: add owner to Project
ALTER TABLE "Project" ADD COLUMN "ownerId" TEXT;

-- AlterTable: add per-membership color
ALTER TABLE "Membership" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#64748b';

-- Backfill Project.ownerId = userId of the earliest Membership (by createdAt) per project
UPDATE "Project" AS p
SET "ownerId" = sub."userId"
FROM (
  SELECT DISTINCT ON ("projectId") "projectId", "userId"
  FROM "Membership"
  ORDER BY "projectId", "createdAt" ASC, "id" ASC
) AS sub
WHERE p."id" = sub."projectId" AND p."ownerId" IS NULL;
