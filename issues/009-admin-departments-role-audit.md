# [009] Audit admin/departments page cho 5 roles mới

**Label:** Done  
**Blocked by:** (none)

## Problem
`DepartmentDirectory.tsx` và `admin/departments/page.tsx` được viết lúc chỉ có 3 roles (employee, manager, admin).  
Cần kiểm tra xem có chỗ nào hardcode `'manager'` hay dùng logic role cũ không — tương tự audit đã làm cho admin/users ở Slice D.

## Slice

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | Kiểm tra departments controller/service có `@Roles` guard nào không |
| UI | `frontend/components/admin/DepartmentDirectory.tsx` + `frontend/app/admin/departments/page.tsx` — tìm và fix role references |

## Implementation notes
Files cần đọc:
- `frontend/app/admin/departments/page.tsx`
- `frontend/components/admin/DepartmentDirectory.tsx`
- `backend/src/departments/departments.controller.ts`

Tìm pattern:
- `'manager'` literal
- `role === 'manager'`  
- `requiredRoles={['manager'`
- `@Roles('manager'`

## Test steps
1. Login với từng role mới (leader, supervisor, executive)
2. Thử access `/admin/departments` → expect 403 (chỉ admin mới vào được)
3. Login admin → quản lý departments bình thường

## Done when
- [x] Không còn reference đến role `'manager'` trong departments pages
- [x] TypeScript không warning về Role type mismatch
