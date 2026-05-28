-- Phase 2: Organizational Structure + Position KPIs

CREATE TYPE "KpiCycle" AS ENUM ('monthly', 'quarterly');

CREATE TABLE "positions" (
    "id" SERIAL NOT NULL,
    "department_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "role_purpose" TEXT,
    "workstreams" JSONB NOT NULL DEFAULT '[]',
    "responsibilities" JSONB NOT NULL DEFAULT '[]',
    "expected_outputs" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "positions_department_id_idx" ON "positions"("department_id");

CREATE TABLE "position_kpis" (
    "id" SERIAL NOT NULL,
    "position_id" INTEGER NOT NULL,
    "kpi_name" VARCHAR(255) NOT NULL,
    "target" TEXT,
    "cycle" "KpiCycle" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "position_kpis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "position_kpis_position_id_idx" ON "position_kpis"("position_id");

ALTER TABLE "users" ADD COLUMN "position_id" INTEGER;

CREATE INDEX "users_position_id_idx" ON "users"("position_id");

ALTER TABLE "positions"
  ADD CONSTRAINT "positions_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "position_kpis"
  ADD CONSTRAINT "position_kpis_position_id_fkey"
  FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_position_id_fkey"
  FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
