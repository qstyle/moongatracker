-- Status bucket for columns (open | in_progress | done), used by roadmap dashboards.
ALTER TABLE "Column" ADD COLUMN "category" TEXT;
