# One Report V1 — Technical Implementation Plan

Generated 2026-05-25 from the spec package at `../one-report-v1-ai-package/` (files 01–08).
This is the answer to **Prompt 1 — Technical Design** in `07_IMPLEMENTATION_PROMPTS_FOR_AI_CODING.md`.

---

## 1. Architectural decisions

| Topic               | Decision                                                                                                     | Why                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Root layout         | Two sibling folders `backend/` + `frontend/` under `one-report-v1/`. No monorepo tooling.                    | MVP scope. Avoid turbo/pnpm-workspace overhead.                                  |
| Backend             | NestJS 10 (modular monolith) + Prisma 5 + PostgreSQL 16 + Passport-JWT + class-validator.                    | Matches `02_TECHNICAL_DESIGN_BRIEF.md`.                                          |
| Frontend            | Next.js 14 App Router + TailwindCSS 3 + TypeScript + SWR for client fetches.                                 | App Router for server components; SWR keeps client state simple.                 |
| AI                  | OpenAI `whisper-1` (STT) + `gpt-4o-mini` (analysis) through an `AiService` interface with a mock fallback.    | Spec 06 §6 mandates a graceful failure path.                                     |
| Audio storage       | Local disk `backend/uploads/audio/`, mounted to a Docker named volume.                                       | MVP. Swappable for S3 later.                                                     |
| Auth                | JWT bearer, 24h expiry, bcrypt cost 10.                                                                      | Sufficient for internal MVP.                                                     |
| Design system       | Hung Phat editorial (beige foundation, charcoal ink, pink accent, serif typography).                         | `05_HP UX_UI SKILL.md`.                                                          |

## 2. Folder structure

```text
one-report-v1/
├── docker-compose.yml
├── .env.example
├── README.md
├── docs/
├── backend/                       # NestJS
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/{decorators,guards,interceptors,filters}/
│   │   ├── config/configuration.ts
│   │   ├── prisma/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── departments/
│   │   ├── reports/
│   │   ├── voice/
│   │   ├── ai/
│   │   ├── dashboard/
│   │   └── admin/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── uploads/audio/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── frontend/                      # Next.js
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx               # role-based redirect
    │   ├── login/
    │   ├── (employee)/employee/{submit-report,history}/
    │   ├── (manager)/manager/{dashboard,reports,issues}/
    │   └── (admin)/admin/{users,departments}/
    ├── components/{layout,forms,dashboard,voice,reports,ui}/
    ├── lib/{api.ts,auth.ts,types.ts}
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── next.config.mjs
    ├── Dockerfile
    ├── package.json
    └── .env.example
```

## 3. Backend module plan

| Module             | Endpoints                                                                                                                    | Notes                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `AuthModule`       | `POST /auth/login`, `GET /auth/me`                                                                                           | Passport `LocalStrategy` (login) + `JwtStrategy` (subsequent). Global `JwtAuthGuard` + `RolesGuard`. |
| `UsersModule`      | `GET /users`, `POST /users`, `PATCH /users/:id`                                                                              | admin-only.                                                                                      |
| `DepartmentsModule`| `GET /departments`, `POST /departments`, `PATCH /departments/:id`                                                            | `GET` for any auth user; mutations admin-only.                                                   |
| `ReportsModule`    | `POST /reports/text`, `POST /reports/voice` (Multer), `GET /reports`, `GET /reports/:id`, `PATCH /reports/:id/status`         | Role-scoped query: employee=own, manager=dept, admin=all.                                        |
| `VoiceService`     | internal                                                                                                                     | Saves audio, returns metadata, hands transcript to `AiService`.                                  |
| `AiModule`         | internal                                                                                                                     | `transcribe(file)`, `analyze(text)`. Falls back to `{summary:null, priority:'medium', has_blocker:false}` on error. |
| `DashboardModule`  | `GET /dashboard/summary`, `GET /dashboard/issues`, `GET /dashboard/missing-reports`                                          | manager + admin.                                                                                 |

Global prefix: `/api/v1`. Global pipes: `ValidationPipe({whitelist:true,transform:true})`. Global filter: `HttpExceptionFilter` with consistent error envelope.

## 4. Frontend page plan

| Route                          | Page                                                                                          | Components                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `/login`                       | Email + password, redirect by role                                                            | `<HpInput>`, `<HpButton primary>`, `<HpErrorText>`               |
| `/employee/submit-report`      | Tabbed Text \| Voice. Voice uses MediaRecorder; falls back to file upload.                    | `<TabSwitch>`, `<VoiceRecorder>`, `<ReportPreviewCard>`          |
| `/employee/history`            | Table of my reports + filters (date, priority)                                                | `<HpTable>`, `<PriorityBadge>`                                   |
| `/manager/dashboard`           | KPI cards + per-department summary                                                            | `<KpiCard>`, `<DeptSummaryTable>`                                |
| `/manager/reports`             | Filter bar (dept/user/date/priority/blocker/status) + table                                   | `<FilterBar>`, `<HpTable>`                                       |
| `/manager/issues`              | Blockers, ordered by priority                                                                 | `<IssueCard>`                                                    |
| `/admin/users`                 | List + create/edit drawer                                                                     | `<HpTable>`, `<UserFormDrawer>`                                  |
| `/admin/departments`           | List + create/edit drawer                                                                     | `<HpTable>`, `<DepartmentFormDrawer>`                            |

Layout: `<AppShell>` with role-aware sidebar and header (user info, logout).

## 5. Database migration plan

Single initial migration `001_init` covering all tables in `03_DATABASE_SCHEMA.md`, plus indexes on `reports(user_id)`, `reports(department_id)`, `reports(created_at)`.

Prisma seed (`prisma/seed.ts`) creates:

- 5 departments (Sales, Operations, Marketing, Accounting, IT)
- 4 users with bcrypt-hashed passwords (see README §2)
- Assigns manager.ops to Operations; employee01/02 to Operations.

## 6. Environment variables

See root `.env.example`. The backend reads its config through `@nestjs/config` from process env (Docker Compose passes them in).

## 7. Implementation order (per-step deliverables)

| Step | Scope                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A    | Root scaffold: `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`, this plan doc.                                           |
| B    | Backend boot: `package.json`, `tsconfig`, `nest-cli`, `main.ts`, `app.module.ts`, Prisma schema + migration + seed, Auth + Users + Departments. |
| C    | Backend domain: Reports (text + voice + list + detail + status), AI service with mock fallback, Dashboard summary/issues/missing.        |
| D    | Frontend boot: Next.js app, Tailwind + Hung Phat theme, `lib/api.ts` + `lib/auth.ts`, `login`, `AppShell`, role redirect.                 |
| E    | Frontend employee surfaces: submit-report (text/voice), history.                                                                         |
| F    | Frontend manager + admin surfaces.                                                                                                       |
| G    | End-to-end smoke test inside Docker; tick off `08_REVIEW_CHECKLIST.md`; document any deferred items.                                     |

## 8. Out of scope for V1

(Quoted from `01_PRD_ONE_REPORT_V1.md` §5 and `02_TECHNICAL_DESIGN_BRIEF.md` §1.)

- Native mobile app, advanced workflow approval, complex notifications, KPI analytics, AI chatbot, multi-agent AI, local AI deployment, Kubernetes, microservices, event-driven architecture, vector database.
