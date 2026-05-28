# One Report V1 — Run Guide

## 1. With Docker Compose (recommended)

```bash
cd one-report-v1
cp .env.example .env
# Optional: paste your OPENAI_API_KEY into .env. Without it the backend uses a
# deterministic mock AI provider that still returns summary / priority / blocker.
docker compose up --build
```

Wait for these log lines before opening the UI:

- `onereport-postgres   ... database system is ready to accept connections`
- `onereport-backend    ... One Report API listening on http://0.0.0.0:4000/api/v1`
- `onereport-frontend   ... ready started server on 0.0.0.0:3000`

Open:

- App: <http://localhost:3000>
- API health (any auth-required endpoint will return 401 without a token, which means the API is up): `curl -i http://localhost:4000/api/v1/auth/me`

## 2. Demo credentials

| Role     | Họ tên            | Email                          | Password   | Department  |
| -------- | ----------------- | ------------------------------ | ---------- | ----------- |
| Admin    | Trần Văn An       | `admin@company.com`            | `admin`    | —           |
| Manager  | Nguyễn Thị Mai    | `manager.ops@company.com`      | `manager`  | Operations  |
| Manager  | Phạm Quang Huy    | `manager.sales@company.com`    | `manager`  | Sales       |
| Employee | Lê Văn Hùng       | `employee01@company.com`       | `employee` | Operations  |
| Employee | Phạm Thị Lan      | `employee02@company.com`       | `employee` | Operations  |
| Employee | Hoàng Minh Tuấn   | `employee03@company.com`       | `employee` | Sales       |
| Employee | Đỗ Thị Hương      | `employee04@company.com`       | `employee` | Marketing   |
| Employee | Vũ Đức Nam        | `employee05@company.com`       | `employee` | IT          |

The seed script is idempotent — re-running it (which happens on every backend boot) upserts these accounts without duplicating them.

## 3. Smoke test — five-minute walkthrough

1. Sign in as `employee01@company.com` / `employee`.
2. On `/employee/submit-report`, type a few lines including the word "blocked" and submit. You should see the result card with an AI summary, a priority chip, and a "blocker detected" stripe (because the mock heuristic / OpenAI picks up the word).
3. Switch to the **Record voice** tab. Either record a short clip or upload a `.webm`/`.mp3`. Submit. You'll see a transcript + summary card.
4. Go to `/employee/history` — both reports show up.
5. Sign out, sign in as `manager.ops@company.com` / `manager`.
6. `/manager/dashboard` — KPIs reflect today's two reports (1 blocker if you used the word, urgent count if priority resolved to "urgent").
7. `/manager/reports` — filter by Priority = High, by Blocker = Only blockers, by date.
8. `/manager/issues` — the blocker card appears with the AI summary.
9. Sign out, sign in as `admin@company.com` / `admin`.
10. `/admin/users` — create a new employee, assign to Operations.
11. `/admin/departments` — add a department, rename one.

If any step fails, check `docker compose logs backend` first.

## 4. Local development without Docker

Two terminals.

**Backend**:

```bash
cd backend
cp .env.example .env
# Point DATABASE_URL at your local Postgres; defaults assume localhost:5432
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

**Frontend**:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## 5. Common operations

| What                      | How                                                                    |
| ------------------------- | ---------------------------------------------------------------------- |
| Reset the database        | `docker compose down -v && docker compose up --build`                  |
| Add a new admin           | Use `/admin/users` after signing in as admin@company.com.              |
| Inspect AI processing log | Connect to Postgres (`docker compose exec postgres psql -U onereport`), `SELECT * FROM ai_processing_logs ORDER BY id DESC LIMIT 20;`. |
| Apply a schema change     | Edit `backend/prisma/schema.prisma`, then `npx prisma migrate dev --name <change>` locally.  |

## 6. Notes & known limitations

- Audio is stored on a Docker named volume (`backend_uploads`). It survives `docker compose down`, but is removed by `docker compose down -v`.
- Without `OPENAI_API_KEY` the AI module returns a heuristic mock (keyword-based). This is by design (spec §6 of `06_AI_PROCESSING_SPEC.md` requires a graceful fallback).
- Auth tokens are stored in `localStorage` and mirrored to a same-site cookie for transport-time visibility; there is no refresh-token rotation in V1.
- The frontend pages are client-rendered (`'use client'`) — Next.js SSR is not used for protected routes.
