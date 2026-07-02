-- ApiToken: re-anchor tokens to a user so a token grants access to ALL of that
-- user's projects (via Membership). projectId is kept for history / legacy
-- single-project tokens but is no longer the authorization anchor.

-- Add owner column (nullable; legacy tokens without an owner fall back to
-- single-project behaviour in the app layer).
ALTER TABLE "ApiToken" ADD COLUMN "userId" TEXT;

-- All-projects tokens have no single project → allow NULL.
ALTER TABLE "ApiToken" ALTER COLUMN "projectId" DROP NOT NULL;

-- Backfill: existing tokens become owned by their project's owner, gaining
-- all-projects access for that owner.
UPDATE "ApiToken" AS t
SET "userId" = p."ownerId"
FROM "Project" AS p
WHERE t."projectId" = p."id"
  AND t."userId" IS NULL
  AND p."ownerId" IS NOT NULL;

-- FK for the new owner relation.
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE;
