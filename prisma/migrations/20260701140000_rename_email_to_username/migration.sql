-- Rename User.email -> User.username (data preserving).
-- The existing @unique index on "email" is renamed automatically by Postgres.
ALTER TABLE "User" RENAME COLUMN "email" TO "username";
