# One Report V1 — Pre-production Hardening

This pass added three things deliberately deferred during the MVP build: automated tests,
structured logging, and pluggable object storage. None of it changes user-facing behaviour;
all of it makes the system easier to operate, debug, and scale.

---

## 1. Automated tests

Jest is wired into the backend via the inline config in `package.json` and a separate
`test/jest-e2e.json` for the integration tests.

| Spec file                                         | What it pins down                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/ai/ai.service.spec.ts`                       | Heuristic-mode analyser: blocker/urgent/clean signals; empty-input fallback; mock transcribe contract. |
| `src/auth/auth.service.spec.ts`                   | Password verify (bcrypt), email lowercase, inactive-user rejection, JWT envelope shape. |
| `src/reports/reports.service.spec.ts`             | Role scoping: employee = own / manager = department / admin = all; cross-scope filters get `403`. |
| `test/auth.e2e-spec.ts`                           | Almost-e2e (boots `AppModule` with a stubbed `PrismaService`): login DTO validation, 401 on wrong password, JWT round-trip on `/auth/me`. |

Run locally:

```bash
cd backend
npm install                 # one-time
npm test                    # unit suite
npm run test:e2e            # supertest integration
npm run test:cov            # coverage report into ../coverage
```

Why no Playwright / frontend tests yet?

The MVP UI is thin (8 pages, mostly forms + tables). Wiring Playwright is a meaningful
amount of CI plumbing and brittle until the design settles. The first follow-up should
add a single happy-path Playwright run (login → submit text report → see in history).

---

## 2. Structured logging

Switched from the default Nest logger to **nestjs-pino**:

- `src/common/logging/logger.config.ts` — log level via `LOG_LEVEL`; pretty single-line
  output in dev, raw JSON in prod (no pretty transport when `NODE_ENV=production`).
- `genReqId` honours an incoming `x-request-id`, otherwise mints a UUID and echoes it
  back on the response.
- Redacts `authorization`, `cookie`, `body.password`, and `body.passwordHash` from logs.
- Maps response statuses to log levels: 5xx → error, 4xx → warn, else info.
- `main.ts` boots with `bufferLogs: true` and replaces the default logger via
  `app.useLogger(app.get(Logger))` so even early bootstrap messages go through pino.

Operating notes:

- Tail JSON logs through `jq`: `docker compose logs -f backend | jq -R 'fromjson? // .'`
- Bump verbosity: set `LOG_LEVEL=trace` in `.env`.
- Filter by request: every line carries `req.id` (or the inbound `x-request-id`).

---

## 3. Pluggable object storage

The voice upload path no longer hard-depends on local disk.

```
ReportsController.createVoice
  └─> AiService.transcribe(buffer, name, mime)   # works regardless of storage
  └─> VoiceService.saveFromMulter(file)
        └─> ObjectStorage (DI)
              ├─ LocalDiskStorage        (STORAGE_DRIVER=local — default)
              └─ S3Storage               (STORAGE_DRIVER=s3)
```

Key file: `src/storage/storage.module.ts` picks the implementation by reading
`STORAGE_DRIVER` at boot. The `ObjectStorage` interface is:

```ts
put(file: Express.Multer.File): Promise<StoredObject>
getDownloadUrl?(key, expiresSeconds): Promise<string | null>
```

### Switching to S3 (or S3-compatible)

`.env`:

```
STORAGE_DRIVER=s3
S3_REGION=us-east-1
S3_BUCKET=one-report
S3_PREFIX=audio
S3_ACCESS_KEY_ID=<aws-key>
S3_SECRET_ACCESS_KEY=<aws-secret>
# Only set for non-AWS providers (MinIO / Cloudflare R2 / Backblaze B2 / etc.)
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=
```

### Local S3 with MinIO (one command)

`docker-compose.yml` defines a MinIO service guarded by the `s3` profile.

```bash
docker compose --profile s3 up --build
```

Once it's up, log into the MinIO console at <http://localhost:9001>
(`minioadmin` / `minioadmin`) and create the `one-report` bucket. Then in `.env`:

```
STORAGE_DRIVER=s3
S3_ENDPOINT=http://minio:9000       # inside compose network
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=one-report
```

Restart the backend container. Voice uploads now land in MinIO. `getDownloadUrl()` on
the S3 driver returns a short-lived pre-signed URL — the frontend doesn't use it yet,
but it's ready for a future "play voice" feature.

### Migration from local to S3

If you already have audio in the local volume and want to move to S3:

```bash
docker compose run --rm \
  -v $(pwd)/migrate.sh:/migrate.sh \
  --entrypoint /migrate.sh backend
```

…or just `aws s3 sync /app/uploads/audio s3://one-report/audio/` against the running
container. Existing `voice_records.file_path` rows point at the local path; you'd want
to rewrite them to the S3 keys (out of scope for this pass — flagged for the next one).

---

## 4. What we still didn't do

- **Frontend tests** — covered by smoke testing for now; Playwright run is the obvious
  next step before any real user trial.
- **Audit log on user/department mutations** — easy to add via a Nest interceptor; not
  needed until there's a real admin team.
- **Refresh tokens** — V1 JWTs are 24h; renew-by-relogin is acceptable for an internal
  tool.
- **Rate limiting** — `@nestjs/throttler` plugs in cleanly; add when exposing beyond
  the office network.
- **`voice_records.file_path` semantics** — currently stores either a local filesystem
  path or an S3 key. The next pass should rename to `storage_driver` + `storage_key`
  to remove the ambiguity.
