-- Migration: v2 — 5 roles, 2 report types, comments, escalation
-- Adds new enum values and columns without dropping existing data.

-- 1. Extend Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'leader';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'executive';

-- 2. Rename existing 'manager' role to 'leader' in users table
UPDATE "users" SET "role" = 'leader' WHERE "role" = 'manager';

-- 3. New enums
CREATE TYPE "ReportType" AS ENUM ('status_report', 'performance_review');
CREATE TYPE "ReviewPeriod" AS ENUM ('weekly', 'monthly', 'quarterly');

-- 4. Extend SourceType enum
ALTER TYPE "SourceType" ADD VALUE IF NOT EXISTS 'task_tracker';

-- 5. Extend ReportStatus enum
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'flagged';

-- 6. Add new columns to reports
ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "report_type"      "ReportType"   NOT NULL DEFAULT 'status_report',
  ADD COLUMN IF NOT EXISTS "status_items"     JSONB          NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "performance_data" JSONB          NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "needs_support"    BOOLEAN        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_flagged"       BOOLEAN        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "flag_note"        TEXT,
  ADD COLUMN IF NOT EXISTS "review_period"    "ReviewPeriod";

-- 7. Migrate existing reports: move original_content into status_items as a single item
UPDATE "reports"
SET "status_items" = jsonb_build_array(
  jsonb_build_object(
    'name', COALESCE("issue_category", 'Hạng mục'),
    'currentStatus', COALESCE("ai_summary", COALESCE("original_content", '')),
    'nextSteps', '',
    'deadline', null,
    'proposal', '',
    'needsSupport', false,
    'priority', COALESCE("ai_priority"::text, 'medium'),
    'hasBlocker', "has_blocker"
  )
)
WHERE "status_items" = '[]'::jsonb
  AND ("original_content" IS NOT NULL OR "ai_summary" IS NOT NULL);

-- 8. Remove report_type default after migration (keep col but drop default)
ALTER TABLE "reports" ALTER COLUMN "report_type" DROP DEFAULT;

-- 9. Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
  "id"         SERIAL      NOT NULL,
  "report_id"  INTEGER     NOT NULL,
  "user_id"    INTEGER     NOT NULL,
  "content"    TEXT        NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "comments_report_id_idx" ON "comments"("report_id");

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_report_id_fkey"
    FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. New indexes
CREATE INDEX IF NOT EXISTS "reports_report_type_idx" ON "reports"("report_type");
CREATE INDEX IF NOT EXISTS "reports_is_flagged_idx"  ON "reports"("is_flagged");
