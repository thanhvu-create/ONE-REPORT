# [010] Login page — cập nhật demo accounts hiển thị 5 roles

**Label:** Done  
**Blocked by:** (none)

## Problem
Login page có section "Tài khoản demo" (`login.demo_accounts`).  
Nếu section này hardcode danh sách accounts với role cũ (`manager`, 3 roles), user mới sẽ không biết dùng account supervisor/executive/leader để test.

## Slice

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | Không |
| UI | `frontend/app/login/page.tsx` — đọc và cập nhật demo accounts list nếu cần |

## Implementation notes
Cần đọc file để xác nhận có hardcode hay không:
- Nếu demo accounts lấy từ seed data → không cần đổi
- Nếu hardcode trong JSX → cập nhật list cho đủ 5 roles

Tài khoản demo theo seed (từ `backend/prisma/seed.ts`):
- `employee@ctyhp.vn` — nhân viên
- `leader@ctyhp.vn` — trưởng phòng
- `supervisor@ctyhp.vn` — giám sát nội bộ
- `executive@ctyhp.vn` — ban lãnh đạo
- `admin@ctyhp.vn` — quản trị

## Test steps
1. Vào `/login`
2. Section demo accounts hiển thị đủ tài khoản cho 5 roles
3. Click vào từng account → điền form đúng

## Done when
- [x] Login page hiển thị ít nhất 1 account mẫu cho mỗi role mới (leader, supervisor, executive)
- [x] Không còn hiển thị `manager` role trong demo list
