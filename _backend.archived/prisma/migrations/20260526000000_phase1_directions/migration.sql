-- Phase 1: Department Direction (Foundation Document)

CREATE TABLE "department_directions" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "overall_objective" TEXT,
    "current_status" TEXT,
    "transformation_direction" TEXT,
    "strategic_functions" JSONB NOT NULL DEFAULT '[]',
    "short_term" TEXT,
    "mid_term" TEXT,
    "long_term" TEXT,
    "key_kpis" JSONB NOT NULL DEFAULT '[]',
    "summary_items" JSONB NOT NULL DEFAULT '[]',
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_directions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "department_directions_department_id_is_current_idx" ON "department_directions"("department_id", "is_current");
CREATE INDEX "department_directions_department_id_created_at_idx" ON "department_directions"("department_id", "created_at");

ALTER TABLE "department_directions"
  ADD CONSTRAINT "department_directions_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
