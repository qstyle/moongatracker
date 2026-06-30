-- Phase 3 fixes:
--   1. Migrate Comment.authorType 'human' → 'user' (pre-existing rows missed by prior migration)
--   2. Migrate Card.authorId '' (empty-string sentinel) → NULL to match nullable column

-- Fix 1: Comment rows that still carry legacy 'human' authorType value
UPDATE "Comment" SET "authorType" = 'user' WHERE "authorType" = 'human';

-- AlterTable: make Card.authorId properly nullable (drop NOT NULL + default first)
ALTER TABLE "Card" ALTER COLUMN "authorId" DROP NOT NULL,
ALTER COLUMN "authorId" DROP DEFAULT;

-- Fix 2: Card rows with empty-string authorId sentinel → NULL now that column is nullable
UPDATE "Card" SET "authorId" = NULL WHERE "authorId" = '';
