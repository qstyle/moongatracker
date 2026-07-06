-- AlterTable
ALTER TABLE "WikiSection" ADD COLUMN "stageId" TEXT;

-- CreateIndex
CREATE INDEX "WikiSection_stageId_idx" ON "WikiSection"("stageId");

-- AddForeignKey
ALTER TABLE "WikiSection" ADD CONSTRAINT "WikiSection_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
