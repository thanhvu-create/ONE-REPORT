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
| Ngôn ngữ UI | Tiếng Việt |
| Responsive | Desktop first, mobile usable |
| Auth security | JWT 24h, bcrypt password |
| AI fallback | Nếu AI lỗi → không block user |
| Upload audio | Tối đa 10 phút / file |
| Performance | Dashboard load < 3s |
| Deployment | Vercel (frontend + backend), Supabase (database) |

---

## 8. Technical Stack (đã quyết định)

| Layer | Công nghệ |
|-------|-----------|
| Backend | NestJS 10 + Prisma 5 |
| Database | Supabase (PostgreSQL) |
| Frontend | Next.js 14 App Router + TailwindCSS + TypeScript |
| Data fetching | SWR |
| AI STT | OpenAI Whisper (`whisper-1`) — fallback: mock provider nếu không có API key |
| AI Analysis | OpenAI GPT (`gpt-4o-mini`) — fallback: mock provider nếu không có API key |
| Auth | Passport-JWT (JWT 24h, bcrypt) + `jose` (edge-compatible JWT verify) |
| Storage | Supabase Storage hoặc S3-compatible (AWS S3 / R2 / B2) |
| Deploy | Vercel (frontend + backend functions) |

---

## 9. Màn hình chính (Screen List)

| Route | Role | Mô tả |
|-------|------|-------|
| `/login` | All | Đăng nhập |
| `/submit/status-report` | employee, leader | Submit Báo cáo Trạng thái Hạng mục (text / voice / paste) |
| `/submit/performance-review` | employee, leader | Submit Đánh giá Kết quả (text / voice) |
| `/history` | employee, leader | Lịch sử tất cả báo cáo của mình, filter theo loại + ngày |
| `/leader/dashboard` | leader | Dashboard phòng mình |
| `/leader/reports` | leader | Danh sách báo cáo phòng + filter theo loại/người/ngày |
| `/supervisor/dashboard` | supervisor | Dashboard toàn công ty |
| `/supervisor/reports` | supervisor | Xem + filter tất cả báo cáo (loại/phòng/người/ngày) |
| `/executive/dashboard` | executive | Dashboard toàn công ty (read-only) |
| `/admin/users` | admin | Quản lý tài khoản |
| `/admin/departments` | admin | Quản lý phòng ban |

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

- [ ] Tất cả 5 roles đăng nhập được, redirect đúng trang
- [ ] Employee submit được Báo cáo Trạng thái Hạng mục bằng cả 3 cách (text / voice / paste Task Tracker)
- [ ] Employee submit được Đánh giá Kết quả bằng cả 2 cách (text / voice)
- [ ] AI transcribe voice và fill form đúng loại báo cáo đang chọn (với fallback nếu lỗi)
- [ ] AI convert paste Task Tracker thành form Trạng thái Hạng mục được
- [ ] Leader thấy dashboard phòng mình, comment được
- [ ] Supervisor/Executive thấy dashboard toàn công ty
- [ ] Admin tạo/sửa được user và phòng ban
- [ ] Chạy được trên Docker Compose
- [ ] Không có lỗi bảo mật nghiêm trọng (auth bypass, data leak giữa phòng)

---

*Document này là nền tảng để implement. Mọi thay đổi spec sau ngày này cần được ghi chú version.*
