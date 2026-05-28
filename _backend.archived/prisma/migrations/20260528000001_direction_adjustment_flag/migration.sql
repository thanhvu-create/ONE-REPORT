-- Phase 4 finalisation: promote needsDirectionAdjustment to a top-level column
-- so it can be indexed and queried without JSON operators.

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "needs_direction_adjustment" BOOLEAN NOT NULL DEFAULT false;

-- Back-fill from existing performance_review rows that have the flag in JSON
UPDATE "reports"
SET "needs_direction_adjustment" = true
WHERE "report_type" = 'performance_review'
  AND "performance_data" ->> 'needsDirectionAdjustment' = 'true';

CREATE INDEX IF NOT EXISTS "reports_needs_direction_adjustment_idx"
  ON "reports"("needs_direction_adjustment");
