# Triển khai 6 báo cáo theo `../6 báo cáo cần thực hiện.md`

Tài liệu nguồn chia hệ thống thành **4 bước** sinh ra **6 hạng mục báo cáo / quản trị**:

| # | Tên (VN) | Tên (EN) | Vai trò |
|---|---|---|---|
| I | Định hướng phòng ban | Department Direction | Foundation Document |
| II | Báo cáo trạng thái hạng mục | Status Report | Operational Report |
| III | Đánh giá kết quả | Performance Review | Outcome vs. direction |
| IV | Task Tracker | Task Tracker | Raw execution data |
| V | Sơ đồ tổ chức | Org Structure | Position & Responsibility |
| VI | KPI cho từng vị trí | Position KPI | Performance system |

Sơ đồ vận hành: `Direction → Org+KPI → Tasks → Status Report → Performance Review → Direction adjustment`.

Để giảm rủi ro và giúp bạn review từng phần, hệ thống được triển khai theo **4 phase** rời nhau, mỗi phase build độc lập + có migration riêng.

---

## ✅ Phase 1 — Định hướng phòng ban (DONE)

### Backend

- Bảng `department_directions` (Prisma model + migration `20260526000000_phase1_directions`):
  - 3 trường scalar phần "Tổng thể" (`overall_objective`, `current_status`, `transformation_direction`)
  - 3 trường timeline (`short_term`, `mid_term`, `long_term`)
  - 3 trường JSONB cho array (`strategic_functions`, `key_kpis`, `summary_items`)
  - `is_current` flag + foreign key `department_id` để giữ history
- Module: `src/department-directions/` (controller + service + 2 DTO file)
- Endpoints (auth required):
  - `GET /api/v1/department-directions` — list direction hiện hành theo role
  - `GET /api/v1/department-directions/:deptId` — chi tiết
  - `GET /api/v1/department-directions/:deptId/history` — 20 bản gần nhất
  - `PUT /api/v1/department-directions/:deptId` — manager (cùng dept) hoặc admin update; tự động snapshot bản hiện tại sang history

### Frontend

- Route mới `/direction` (mọi role login đều thấy)
- Components:
  - `components/direction/DirectionView.tsx` — render 5 section dạng đọc
  - `components/direction/DirectionEditor.tsx` — form 5 section với add/remove row cho strategic functions / KPIs / summary
  - `app/direction/page.tsx` — orchestrator: SWR, role guard, dept selector (admin), nút Edit (manager/admin)
- i18n: 30+ key `direction.*` cho cả vi + en
- Nav link "Định hướng phòng ban" trong sidebar AppShell

### Smoke test đã chạy

- `manager.ops` PUT direction → lưu OK, isCurrent=true ✅
- 2 strategic functions + 2 KPI persist đúng ✅
- `employee01` PUT → HTTP 403 ✅
- `employee01` GET (cùng dept) → đọc được ✅

### Quyền

| Role | Read | Write |
|---|---|---|
| admin | tất cả phòng | tất cả phòng |
| manager | phòng mình | phòng mình |
| employee | phòng mình | ❌ |

---

## ✅ Phase 2 — Sơ đồ tổ chức + KPI vị trí (DONE)

### Backend

- Migration `20260527000000_phase2_positions`:
  - Bảng `positions(id, department_id, title, role_purpose, workstreams JSONB, responsibilities JSONB, expected_outputs JSONB, created_at, updated_at)`
  - Bảng `position_kpis(id, position_id, kpi_name, target, cycle ENUM('monthly','quarterly'), notes, created_at, updated_at)`
  - Cột `users.position_id` (FK → positions, onDelete: SetNull)
- Module `src/positions/` (controller + service + 4 DTO files)
- Endpoints (auth required):
  - `GET /api/v1/positions?departmentId=X` — list positions theo role (admin thấy tất cả; leader/employee chỉ dept mình)
  - `GET /api/v1/positions/:id` — chi tiết + KPIs
  - `POST /api/v1/positions` — tạo (admin hoặc leader của dept đó)
  - `PUT /api/v1/positions/:id` — update
  - `DELETE /api/v1/positions/:id` — xoá
  - `POST /api/v1/positions/:id/kpis` — thêm KPI
  - `PUT /api/v1/positions/:id/kpis/:kpiId` — sửa KPI
  - `DELETE /api/v1/positions/:id/kpis/:kpiId` — xoá KPI
- Users service + DTO cập nhật để set `positionId` khi tạo / sửa user

### Frontend

- Types: `Position`, `PositionKpi`, `KpiCycle` trong `lib/types.ts`; `UserRecord` + `AuthenticatedUser` có `positionId`
- i18n: 45+ key `positions.*` cho cả vi + en
- Route `/admin/positions` — list positions theo dept; admin chọn dept dropdown; leader thấy dept mình
- Route `/admin/positions/[id]` — detail page với 2 tab: **Chi tiết** (edit form với string-list editor) + **KPIs** (CRUD inline)
- `MyPositionWidget` component — hiển thị vị trí + KPIs của user trên trang lịch sử (employee) và leader dashboard
- Nav link "Sơ đồ tổ chức" trong sidebar cho `admin` và `leader`

### Quyền

| Role | Read | Write |
|---|---|---|
| admin | tất cả phòng | tất cả phòng |
| leader | phòng mình | phòng mình |
| employee/supervisor/executive | phòng mình | ❌ |

---

## ✅ Phase 3 — Task Tracker (DONE)

### Backend

- Migration `20260528000000_phase3_tasks`:
  - Bảng `tasks(id, user_id, department_id, position_id, title, description, status ENUM('todo','doing','blocked','done'), priority ENUM, deadline, completed_at, parent_task_id, created_at, updated_at)`
  - Bảng `task_status_history(id, task_id, from_status, to_status, changed_by_id, note, changed_at)` — trail đầy đủ
- Enum `TaskStatus` thêm vào Prisma schema
- Back-relations thêm vào `User`, `Department`, `Position`
- Module `src/tasks/` (controller + service + 4 DTO files)
- Endpoints:
  - `GET /api/v1/tasks` — list (employee=mình; leader=dept; admin/supervisor/executive=all); filter status/priority/overdue/search
  - `GET /api/v1/tasks/stats` — count theo status + overdue cho dashboard widget
  - `GET /api/v1/tasks/:id` — chi tiết + statusHistory + subtasks
  - `POST /api/v1/tasks` — tạo task
  - `PATCH /api/v1/tasks/:id` — update (tự ghi history khi status đổi)
  - `DELETE /api/v1/tasks/:id`
  - `POST /api/v1/tasks/parse-sheet` — AI parse text dán từ Google Sheet → previews
  - `POST /api/v1/tasks/bulk-create` — tạo nhiều task từ previews

### Frontend

- Types: `TaskStatus`, `Task`, `TaskWithHistory`, `TaskStatusHistory`, `TaskListResponse`, `TaskStats`, `TASK_STATUS_LABELS`, `TASK_STATUS_COLORS`
- i18n: 50+ key `tasks.*` cho vi + en
- Route `/tasks` (mọi role) — table + filter (status/priority/overdue) + stats row + create/edit/delete
- `TaskFormModal` — create/edit với status note khi thay đổi trạng thái
- `MyTasksWidget` — widget "Task của tôi" hiển thị urgent/overdue/blocked tasks; đặt ở `/history` và `/leader/dashboard`
- `SheetPastePanel` (inline trong `/tasks`) — dán text → AI parse → preview → bulk create
- Nav link "Task Tracker" trong AppShell cho mọi role

### Quyền

| Role | Read | Write |
|---|---|---|
| admin | tất cả | tất cả |
| supervisor / executive | tất cả | ❌ (read-only) |
| leader | phòng mình | phòng mình |
| employee | task mình | task mình |

---

## ⏳ Phase 4 — Status Report + Performance Review structured (chưa làm)

### Plan

**Backend:**

- Mở rộng bảng `reports`:
  - Thêm cột `report_type ENUM('free_text','status','performance')` (default 'free_text' để giữ tương thích ngược)
  - 2 bảng phụ:
    - `status_report_items(id, report_id, item_title, current_status, next_steps, deadline, proposal, support_needed)` — mỗi report có nhiều item
    - `performance_review(id, report_id, period_type ENUM('weekly','monthly','quarterly'), period_label, achievements, gaps, opportunities, adjustments, direction_id?)` — link tới Direction để chấm "đã đạt vs định hướng"
- Tự động liên kết `reports.created_at + direction.is_current` để Performance Review review đúng version Direction lúc đó

**Frontend:**

- Cập nhật `/employee/submit-report`:
  - Thêm 2 tab nữa: "Status Report" + "Performance Review" bên cạnh Text/Voice
  - Status Report: form thêm/sửa nhiều item (mỗi item 5 trường: Hiện trạng / Bước kế tiếp / Deadline / Đề xuất / Cần hướng dẫn)
  - Performance Review: form 4 section (Đạt / Chưa đạt / Cơ hội / Điều chỉnh) + dropdown period
- `/manager/reports` filter mới: `report_type`
- Dashboard mới: tiến độ Performance Review theo period

### Cycle automation

Theo file gốc:

- Status Report: thứ 4 + thứ 7 / hoặc khi yêu cầu → có thể thêm reminder cron sau
- Performance Review: weekly / monthly / quarterly → period dropdown + ngày cuối period tự auto-fill

---

## Tóm tắt phase status

| Phase | Module | Trạng thái |
|---|---|---|
| 1 | Định hướng phòng ban | ✅ DONE |
| 2 | Sơ đồ tổ chức + KPI | ✅ DONE |
| 3 | Task Tracker | ✅ DONE |
| 4 | Status Report + Performance Review | ✅ DONE |
