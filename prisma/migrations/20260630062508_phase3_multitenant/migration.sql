-- AlterTable
ALTER TABLE "ApiToken" ALTER COLUMN "scopes" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "authorType" SET DEFAULT 'user';
