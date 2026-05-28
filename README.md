# One Report V1

Hệ thống báo cáo nội bộ tập trung. Nhân viên nộp báo cáo bằng text hoặc giọng nói; quản lý xem dashboard tổng hợp có AI phân tích, blocker và mức độ ưu tiên.

## Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend + API | Next.js 14 App Router + TailwindCSS + TypeScript |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma 5 |
| AI | Google Gemini (`gemini-2.0-flash`) — mock fallback nếu không có API key |
| Auth | JWT (HS256, 24h) + bcrypt + `jose` |
| Deploy | Vercel |
| Reminders | Vercel Cron Job (01:00 UTC hàng ngày) |

## Cấu trúc thư mục

```
one-report-v1/
├── app/                    Next.js pages + API route handlers
│   ├── api/                Route handlers (auth, reports, dashboard, tasks, positions, …)
│   │   └── cron/           Vercel Cron Jobs (reminders)
│   └── (pages)
├── components/             React components
├── lib/
│   ├── server/             prisma.ts, auth.ts, ai.ts, route.ts
│   └── …
├── prisma/                 schema.prisma + seed.ts
├── docs/                   PRD, kế hoạch, ghi chú
├── _backend.archived/      NestJS backend cũ (archived, không dùng nữa)
├── vercel.json
└── README.md
```

## Chạy local

```bash
npm install
cp .env.example .env        # điền DATABASE_URL + JWT_SECRET + GEMINI_API_KEY
npx prisma db push          # sync schema lên Supabase
npx prisma db seed          # tạo 5 demo accounts
npm run dev                 # http://localhost:3000
```

## Biến môi trường (.env)

| Biến | Bắt buộc | Mô tả |
|------|----------|-------|
| `DATABASE_URL` | ✓ | Supabase connection string (pooler port 6543) |
| `DIRECT_URL` | ✓ | Supabase direct connection (port 5432, dùng cho migrate) |
| `JWT_SECRET` | ✓ | Secret ký JWT, tối thiểu 32 ký tự |
| `GEMINI_API_KEY` | — | Google AI Studio key; để trống → mock mode |
| `SMTP_HOST` | — | Bật email reminder hàng ngày |
| `SMTP_NOTIFY_TO` | — | Địa chỉ nhận email danh sách chưa nộp báo cáo |

Xem đầy đủ tại `.env.example`.

## Deploy lên Vercel

```bash
# Lần đầu
vercel link
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add JWT_SECRET
vercel env add GEMINI_API_KEY

# Deploy
vercel --prod
```

Vercel Cron Job (`/api/cron/reminders`) tự động kích hoạt lúc 01:00 UTC mỗi ngày sau khi deploy.

## Roles

| Role | Quyền chính |
|------|------------|
| `employee` | Submit báo cáo, xem lịch sử của mình |
| `leader` | Xem + comment báo cáo phòng mình, dashboard phòng |
| `supervisor` | Xem tất cả phòng, flag vấn đề |
| `executive` | Dashboard toàn công ty (read-only) |
| `admin` | Quản lý users, phòng ban, positions |
