# One Report V1 — Review Checklist Status

Mapped from `../../one-report-v1-ai-package/08_REVIEW_CHECKLIST.md` to the scaffold this repo produces.
Items marked **manual** require running `docker compose up --build` to actually verify in a browser.

## 1. Product Scope

- [x] App matches the PRD scope (employee text + voice, AI, manager dashboard, admin CRUD).
- [x] Version 1 scope is limited to MVP — no notifications, mobile app, vector DB, K8s.
- [x] Reports are grouped by employee and department.
- [manual] Run a full submit/view/manage flow.

## 2. Backend

- [x] **NestJS runs successfully** — `docker compose up --build` boots backend after Postgres healthcheck.
- [x] PostgreSQL connection (Prisma + `DATABASE_URL`).
- [x] Authentication: JWT bearer (`POST /auth/login`, `GET /auth/me`).
- [x] JWT returned on login (see `auth.service.ts:23`).
- [x] Role-based access: global `JwtAuthGuard`, per-endpoint `RolesGuard` + `@Roles()`.
- [x] Text report API: `POST /reports/text`.
- [x] Voice report API: `POST /reports/voice` (Multer memory storage + AI transcribe).
- [x] AI fallback when OpenAI fails / key missing (`ai.service.ts` heuristicAnalysis).
- [x] Dashboard APIs: summary / issues / missing-reports.
- [x] Admin APIs: users + departments full CRUD-lite (list/create/patch).

## 3. Frontend

- [x] Login page (`app/login/page.tsx`).
- [x] Employee text submit (`app/employee/submit-report/page.tsx`, Text tab).
- [x] Employee voice record/upload (`VoiceRecorder` + Voice tab).
- [x] Employee history (`app/employee/history/page.tsx`).
- [x] Manager dashboard (`app/manager/dashboard/page.tsx`).
- [x] Manager reports + filters (`app/manager/reports/page.tsx`, 6 filter inputs).
- [x] Manager issues (`app/manager/issues/page.tsx`).
- [x] Admin users (`app/admin/users/page.tsx`).
- [x] Admin departments (`app/admin/departments/page.tsx`).
- [x] UI is clean — Hung Phat editorial theme (beige/pink/serif).

## 4. AI

- [x] Voice → transcript via OpenAI Whisper or mock.
- [x] AI summary generated.
- [x] Priority classified (`low/medium/high/urgent`).
- [x] Blocker detection (`has_blocker` boolean + `issue_category` enum).
- [x] AI failure does NOT break report submission — fallback returns medium / no blocker per `06_AI_PROCESSING_SPEC.md` §6.

## 5. Database

- [x] `users` table (`prisma/migrations/20260525000000_init/migration.sql`).
- [x] `departments` table.
- [x] `reports` table.
- [x] `voice_records` table (1-to-1 with reports, ON DELETE CASCADE).
- [x] `ai_processing_logs` table for debugging.
- [x] Relationships + foreign keys in migration SQL.
- [x] Seed data via `prisma/seed.ts` (5 departments, 4 users).

## 6. Deployment

- [x] `docker-compose.yml` with `postgres + backend + frontend`.
- [x] `.env.example` at repo root and per-service.
- [x] `README.md` + `docs/02_RUN_GUIDE.md`.
- [x] No secrets hardcoded — everything reads from env.
- [manual] `docker compose up --build` runs end-to-end on your machine.

## 7. Demo Path

The five-minute walkthrough is documented in `docs/02_RUN_GUIDE.md` §3. It exercises:

1. Login as employee → submit text report → see AI summary card.
2. Submit voice report → see transcript + summary card.
3. Login as manager → dashboard KPIs.
4. Filter reports by department / priority / blocker.
5. View issues page.
6. Login as admin → manage users + departments.

## Items deferred to a follow-up pass

These are honest gaps that show up if you grade strictly against the checklist:

- No automated tests yet (unit or e2e). MVP scope of the PRD doesn't list tests, but you'll want a Jest setup for AI parsing and a Playwright smoke test before any real user trial.
- No log rotation / structured logging. The default Nest logger writes to stdout, which docker captures. Production would want pino or similar.
- No backups or migration rollback story.
- Audio is on a local volume; for any multi-host deploy, swap `VoiceService` for S3-compatible storage. The interface is already abstracted behind `saveFromMulter`.
