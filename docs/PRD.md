# PRD — One Report V1
**Product Requirements Document**
Phiên bản: 1.0 | Ngày: 2026-05-27 | Tác giả: thanhvu@ctyhp.vn

---

## 1. Tổng quan sản phẩm

### 1.1 Tên sản phẩm
**One Report** — Hệ thống báo cáo nội bộ tập trung

### 1.2 Vấn đề đang giải quyết
Công ty hiện đang dùng Google Sheet để thu thập báo cáo nội bộ, dẫn đến 4 vấn đề chính:

| # | Vấn đề | Hậu quả |
|---|--------|---------|
| 1 | Không có format chuẩn | Mỗi người báo cáo theo cách khác nhau, khó tổng hợp |
| 2 | Không có dashboard tổng hợp | Quản lý phải mở từng sheet thủ công để nắm tình hình |
| 3 | Không có kênh ghi âm | Nhân viên muốn báo cáo nhanh bằng giọng nói nhưng không có nơi lưu |
| 4 | Không phân quyền | Mọi người đều xem được báo cáo của nhau |

### 1.3 Bối cảnh hệ thống

One Report là **lớp thực thi** trong chuỗi vận hành lớn hơn của công ty:

```
Định hướng Phòng Ban (Foundation Document)
        ↓
Sơ đồ Tổ chức + KPI
        ↓
Task Tracker — Google Sheet (raw execution data)
        ↓
ONE REPORT APP ← điểm này
    ├── Báo cáo Trạng thái Hạng mục (Thứ 4 / Thứ 7)
    └── Đánh giá Kết quả (Weekly / Monthly / Quarterly)
        ↓
Dashboard → Quản lý ra quyết định
        ↓
Điều chỉnh Định hướng
```

App không thay thế Task Tracker — Task Tracker vẫn là nguồn dữ liệu thô. App là nơi **tổng hợp có insight** từ dữ liệu đó.

### 1.4 Mục tiêu sản phẩm
- **Chuẩn hóa** 2 loại báo cáo chính thành form có hướng dẫn rõ từng trường
- **Tập trung** toàn bộ báo cáo về 1 nơi, có dashboard theo phân quyền
- **Giảm ma sát** bằng 3 cách nhập: điền tay, ghi âm, paste từ Task Tracker → AI xử lý
- **Minh bạch có kiểm soát** — ai được xem gì đều do role quyết định

### 1.5 Phạm vi V1
V1 là bản **working prototype** để ban lãnh đạo đánh giá hướng đi. Không cần hoàn hảo, cần đủ logic và đủ chạy được.

---

## 2. Người dùng (User Personas)

### Cơ cấu tổ chức
```
Chủ Tổng Giám Đốc
        ↓
   Ban Giám Đốc
        ↓
Ban Giám Sát Nội Bộ
        ↓
  Leader (8 phòng)
        ↓
 Employee (8 phòng)
```

**8 phòng ban:** Nhân Sự · R&D · Kinh Doanh · Marketing · IT · Sản Xuất · Kho Tổng · Kế Toán

### Role mapping trong app

| Role | Đại diện | Mô tả |
|------|---------|-------|
| `executive` | Chủ TGĐ + Ban GĐ | Xem toàn bộ, dashboard công ty |
| `supervisor` | Ban Giám Sát Nội Bộ | Xem tất cả 8 phòng, flag vấn đề |
| `leader` | Trưởng phòng (8 người) | Xem + comment phòng mình, tự submit báo cáo |
| `manager` | Quản lý cấp trung | Quyền tương đương leader — xem + submit phòng mình |
| `employee` | Nhân viên | Submit báo cáo, xem lịch sử của mình |
| `admin` | Phòng IT | Quản lý tài khoản, phòng ban, cấu hình hệ thống |

---

## 3. Tính năng (Feature Requirements)

### 3.1 Authentication
- Đăng nhập bằng email + mật khẩu
- JWT token, tự động redirect theo role sau đăng nhập
- Không có self-register — tài khoản do `admin` tạo

### 3.2 Hai loại báo cáo

#### Loại 1 — Báo cáo Trạng thái Hạng mục
> Báo cáo vận hành chính. Chu kỳ: **Thứ 4 và Thứ 7** hàng tuần.
> Mục đích: theo dõi tiến độ thực tế, phát hiện vấn đề sớm.

Form có **1 hoặc nhiều hạng mục công việc**, mỗi hạng mục gồm:

| Trường | Loại | Bắt buộc |
|--------|------|---------|
| Tên hạng mục công việc | Text | ✓ |
| Hiện trạng | Textarea | ✓ |
| Bước kế tiếp | Textarea | ✓ |
| Deadline | Date picker | ✓ |
| Đề xuất / Ghi chú | Textarea | — |
| Cần hỗ trợ? | Toggle Yes/No | ✓ |
| Mức độ ưu tiên | Select: Cao / Trung bình / Thấp | ✓ |
| Có blocker? | Toggle Yes/No | ✓ |

- Người dùng có thể **thêm nhiều hạng mục** trong 1 báo cáo (tối đa 10)
- Nút **"+ Thêm hạng mục"** để thêm dòng mới

---

#### Loại 2 — Đánh giá Kết quả
> Báo cáo quan trọng nhất, dễ làm sai nhất. **Không phải "đã làm gì" — mà là "đã đạt gì so với định hướng".**
> Chu kỳ: **Weekly** (ngắn gọn) · **Monthly** (đầy đủ) · **Quarterly** (chiến lược).

Form có **4 phần cố định**:

| Phần | Trường | Bắt buộc |
|------|--------|---------|
| **1. Kết quả đạt được** | Những gì hoàn thành đúng định hướng | ✓ |
| | KPI đạt / vượt (ghi cụ thể con số) | ✓ |
| **2. Chưa đạt / Thất bại** | Mục tiêu không đạt | ✓ |
| | Lý do thực tế (không được ghi chung chung) | ✓ |
| **3. Cơ hội & Cải tiến** | Insight rút ra | — |
| | Cơ hội mới phát hiện | — |
| **4. Điều chỉnh Định hướng** | Có cần chỉnh chiến lược không? | ✓ |
| | Điều chỉnh cụ thể gì (nếu có) | — |

- Phần 2 bắt buộc phải có lý do cụ thể — AI sẽ cảnh báo nếu câu trả lời quá chung chung (ví dụ: "do bận", "chưa kịp")
- Mức độ ưu tiên + Cần hỗ trợ vẫn có ở header của báo cáo

---

### 3.3 Cách nhập liệu (3 cách — áp dụng cho cả 2 loại)

#### Cách 1: Điền form trực tiếp
Người dùng điền trực tiếp vào từng trường. Nút **Submit** → lưu, hiển thị confirmation.

#### Cách 2: Ghi âm → AI xử lý
1. Người dùng nhấn **Ghi âm**, nói tự do không cần theo format
2. Nhấn **Dừng** → audio gửi lên server
3. AI (Whisper) chuyển giọng nói → văn bản
4. AI (GPT) phân tích → tự điền vào các trường form tương ứng với loại báo cáo đang chọn
5. Người dùng **review và chỉnh sửa** nếu cần → Submit

#### Cách 3: Paste từ Task Tracker → AI xử lý
1. Người dùng copy dữ liệu thô từ Google Sheet Task Tracker
2. Paste vào ô text lớn trong app
3. AI (GPT) đọc dữ liệu thô → convert sang form Báo cáo Trạng thái Hạng mục
4. Người dùng review và chỉnh sửa → Submit

> **Fallback cho cả 3 cách:** Nếu AI lỗi → hiển thị văn bản thô, user tự điền. Không block submit.

### 3.4 Xem lịch sử báo cáo (Employee + Leader)

- Danh sách báo cáo đã nộp của bản thân
- Filter theo: ngày, mức độ ưu tiên
- Xem chi tiết từng báo cáo
- **Không thể chỉnh sửa** sau khi submit (V1)

### 3.5 Dashboard phòng ban (Leader)

Leader xem dashboard phòng mình, gồm:

| Thông tin | Mô tả |
|-----------|-------|
| Danh sách nhân viên + trạng thái nộp | Ai đã nộp / chưa nộp trong kỳ này |
| Tổng số báo cáo theo mức độ ưu tiên | Cao / Trung bình / Thấp |
| Danh sách blocker đang mở | Các mục có `blocker = Yes` |
| Danh sách mục cần hỗ trợ | Các mục có `cần hỗ trợ = Yes` |

Leader có thể **comment** vào từng báo cáo của nhân viên trong phòng.

### 3.6 Dashboard toàn công ty (Supervisor + Executive)

| Thông tin | Mô tả |
|-----------|-------|
| Tổng hợp theo 8 phòng | Số báo cáo đã/chưa nộp mỗi phòng |
| Danh sách blocker toàn công ty | Sắp xếp theo mức độ ưu tiên |
| Danh sách người chưa nộp báo cáo | Theo phòng ban |
| Top hạng mục ưu tiên Cao | Nổi bật, dễ thấy |

Supervisor có thể **flag** một báo cáo/vấn đề để escalate lên executive.

### 3.7 Quản lý hệ thống (Admin)

- **Quản lý Users:** Tạo, sửa, vô hiệu hóa tài khoản; gán role; gán phòng ban
- **Quản lý Phòng ban:** Tạo, sửa tên phòng ban
- Admin không thấy nội dung báo cáo (chỉ quản lý hệ thống)

---

## 4. Chu kỳ báo cáo

| Loại báo cáo | Tần suất | Độ dài |
|---|---|---|
| Báo cáo Trạng thái Hạng mục | Thứ 4 và Thứ 7 hàng tuần | Ngắn — theo từng hạng mục |
| Đánh giá Kết quả | Weekly (mỗi tuần) | Ngắn gọn |
| Đánh giá Kết quả | Monthly (cuối tháng) | Đầy đủ |
| Đánh giá Kết quả | Quarterly (cuối quý) | Chiến lược toàn diện |

- App **không enforce deadline** trong V1 — chỉ hiển thị indicator ai chưa nộp
- Không có push notification / email trong V1

---

## 5. Phân quyền chi tiết

| Quyền | employee | leader | supervisor | executive | admin |
|-------|:--------:|:------:|:----------:|:---------:|:-----:|
| Submit báo cáo | ✓ | ✓ | — | — | — |
| Xem báo cáo của mình | ✓ | ✓ | — | — | — |
| Xem báo cáo phòng mình | — | ✓ | — | — | — |
| Xem báo cáo tất cả phòng | — | — | ✓ | ✓ | — |
| Comment vào báo cáo | — | ✓ | ✓ | ✓ | — |
| Flag / Escalate vấn đề | — | — | ✓ | — | — |
| Dashboard phòng | — | ✓ | — | — | — |
| Dashboard toàn công ty | — | — | ✓ | ✓ | — |
| Quản lý users | — | — | — | — | ✓ |
| Quản lý phòng ban | — | — | — | — | ✓ |

---

## 6. Logic Flow

```
[EMPLOYEE / LEADER]
        │
        ├─ Chọn loại báo cáo: [Trạng thái Hạng mục] hoặc [Đánh giá Kết quả]
        │
        ├── Cách 1: Điền form trực tiếp ──────────────────────┐
        │                                                       │
        ├── Cách 2: Ghi âm                                      │
        │     └→ Whisper STT → văn bản                          │
        │           └→ GPT phân tích → fill form               │
        │                 └→ User review & chỉnh sửa ──────────┤
        │                                                       │
        └── Cách 3: Paste Task Tracker (Google Sheet)           │
              └→ GPT convert → fill form Trạng thái            │
                    └→ User review & chỉnh sửa ────────────────┤
                                                               ↓
                                                    [SUBMIT → DATABASE]
                                                               │
                         ┌─────────────────────────────────────┤
                         ↓                                     ↓
               [LEADER DASHBOARD]               [SUPERVISOR / EXECUTIVE]
               - Phòng mình                     - Toàn công ty (8 phòng)
               - Ai chưa nộp                    - Blocker nổi bật
               - Blocker phòng                  - Người chưa nộp
               - Cần hỗ trợ                     - Top ưu tiên Cao
                         │
                         ↓
               Comment / Supervisor Flag → Escalate lên Executive
```

---

## 7. Yêu cầu phi chức năng

| Hạng mục | Yêu cầu |
|----------|---------|
| Ngôn ngữ UI | Tiếng Việt (mặc định) + English (toggle) |
| Responsive | Desktop first, mobile usable |
| Auth security | JWT HS256 · 24h expiry · bcrypt cost 10 |
| AI fallback | Nếu Gemini lỗi hoặc không có API key → mock response, không block submit |
| Upload audio | Tối đa 10 phút / file, định dạng webm/ogg/mp4 |
| Performance | Dashboard load < 3s, API < 1s (Vercel + Supabase cùng region) |
| Deployment | Vercel auto-deploy từ GitHub `main` · Supabase PostgreSQL |
| Cron | Nhắc nhở nhân viên chưa nộp báo cáo — 9:00 UTC thứ 2–6 (SMTP optional) |

---

## 8. Technical Stack (hiện tại)

| Layer | Công nghệ |
|-------|-----------|
| Fullstack framework | Next.js 14 App Router — frontend + API routes trong cùng 1 repo |
| Database | Supabase PostgreSQL (region: `ap-southeast-2` Sydney) |
| ORM | Prisma 5 — schema, migration, seed |
| DB Connection | Supabase Supavisor pooler (port 6543, transaction mode) |
| Data fetching | SWR (client-side) |
| AI STT | Google Gemini (`gemini-2.0-flash`) — transcribe audio inline data |
| AI Analysis | Google Gemini (`gemini-2.0-flash`) — phân tích báo cáo, parse voice/text |
| AI Fallback | Mock mode khi không có `GEMINI_API_KEY` — không block submit |
| Auth | JWT HS256 via `jose` — sign + verify, 24h expiry, bcrypt passwords |
| Middleware | Next.js middleware — route guard theo token, redirect về `/login` |
| Deploy | Vercel (Fluid Compute) — auto-deploy từ GitHub `main` branch |
| Source control | GitHub (`thanhvu-create/ONE-REPORT`) |
| Cron | Vercel Cron — `/api/cron/reminders` chạy 9:00 UTC thứ 2–6 |

### Cấu trúc repo

```
one-report/
├── app/
│   ├── api/          ← API routes (thay thế backend riêng)
│   ├── admin/        ← Admin pages
│   ├── leader/       ← Leader pages
│   ├── supervisor/   ← Supervisor pages
│   ├── executive/    ← Executive pages
│   ├── employee/     ← Employee pages
│   ├── manager/      ← Manager pages
│   ├── submit/       ← Submit report pages
│   └── ...
├── components/       ← UI components
├── lib/
│   ├── server/       ← Server-only: prisma, auth, ai, reports
│   └── ...           ← Client: api.ts, auth.ts, types.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── vercel.json
```

### Environment Variables (Vercel)

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | Supavisor pooler URL (port 6543) |
| `DIRECT_URL` | Direct connection URL (port 5432, dùng cho migrate) |
| `JWT_SECRET` | Secret key ký JWT |
| `JWT_EXPIRES_IN` | Thời hạn token (mặc định `24h`) |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GEMINI_MODEL` | Model name (mặc định `gemini-2.0-flash`) |
| `CRON_SECRET` | Bearer token Vercel dùng khi invoke cron job |

---

## 9. Màn hình chính (Screen List)

| Route | Role | Mô tả |
|-------|------|-------|
| `/login` | All | Đăng nhập email + password |
| `/submit/status-report` | employee, leader, manager | Submit Báo cáo Trạng thái Hạng mục (form / voice / paste Task Tracker) |
| `/submit/performance-review` | employee, leader, manager | Submit Đánh giá Kết quả (form / voice) |
| `/employee/submit-report` | employee | Shortcut trang submit cho employee |
| `/employee/history` | employee | Lịch sử báo cáo của cá nhân |
| `/history` | All (auth) | Lịch sử báo cáo + filter loại/ngày, xem chi tiết |
| `/reports/[id]` | All (auth) | Chi tiết báo cáo — comment, flag, resolve |
| `/tasks` | All (auth) | Task Tracker: tạo/sửa tasks, parse từ Google Sheet, subtasks |
| `/direction` | All (auth) | Định hướng phòng ban — xem + chỉnh sửa (leader/manager/admin) |
| `/leader/dashboard` | leader, manager | Dashboard phòng mình — KPI cards, trend, missing, blockers |
| `/leader/reports` | leader, manager | Danh sách báo cáo phòng + filter loại/người/ngày/priority |
| `/manager/dashboard` | manager | Redirect → `/leader/dashboard` |
| `/manager/reports` | manager | Redirect → `/leader/reports` |
| `/manager/issues` | manager | Redirect → leader issues view |
| `/supervisor/dashboard` | supervisor | Dashboard toàn công ty — heatmap, issues, contributors |
| `/supervisor/reports` | supervisor | Xem + filter tất cả báo cáo + export CSV |
| `/executive/dashboard` | executive | Dashboard toàn công ty (read-only) |
| `/admin/users` | admin | Quản lý users — tạo, sửa, vô hiệu hóa |
| `/admin/departments` | admin | Quản lý phòng ban |
| `/admin/positions` | admin, leader | Sơ đồ tổ chức — vị trí + KPI theo vị trí |
| `/admin/positions/[id]` | admin, leader | Chi tiết vị trí + quản lý KPI |

---

## 10. Out of Scope (V1 không làm)

- Mobile native app (iOS/Android)
- Approval workflow (duyệt báo cáo)
- Push notification / Email reminder
- KPI tự động tính toán
- Export PDF / Excel
- AI chatbot
- Chỉnh sửa báo cáo sau khi submit
- Multi-language (chỉ cần tiếng Việt)
- Kubernetes / microservices

---

## 11. Định nghĩa hoàn thành (Definition of Done — V1)

- [x] Tất cả 6 roles đăng nhập được, redirect đúng trang
- [x] Employee/leader/manager submit được Báo cáo Trạng thái Hạng mục (form / voice / paste Task Tracker)
- [x] Employee/leader/manager submit được Đánh giá Kết quả (form / voice)
- [x] AI (Gemini) transcribe voice và fill form đúng loại báo cáo đang chọn
- [x] AI fallback — không block submit khi Gemini lỗi hoặc thiếu API key
- [x] AI convert paste Task Tracker thành form Trạng thái Hạng mục
- [x] Leader/manager thấy dashboard phòng mình, comment được
- [x] Supervisor/Executive thấy dashboard toàn công ty, export CSV
- [x] Admin tạo/sửa được user, phòng ban, vị trí + KPI
- [x] Supervisor có thể flag/resolve báo cáo kèm ghi chú
- [x] Định hướng phòng ban — tạo/sửa được, hiển thị cho toàn phòng
- [x] Task Tracker — tạo/sửa tasks, bulk import từ Google Sheet
- [x] Deploy trên Vercel, auto-deploy từ GitHub `main`
- [x] Database Supabase PostgreSQL, migrate + seed hoàn chỉnh
- [x] Không có lỗi bảo mật nghiêm trọng (auth bypass, data leak giữa phòng)

---

*Document này là nền tảng để implement. Mọi thay đổi spec sau ngày này cần được ghi chú version.*
