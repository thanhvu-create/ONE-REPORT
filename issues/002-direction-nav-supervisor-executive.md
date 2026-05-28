# [002] Direction nav link cho supervisor và executive

**Label:** Done  
**Blocked by:** (none)

## Problem
`AppShell.tsx` LINKS hiện chỉ map `nav.direction → /direction` cho `['employee', 'leader']`.  
Supervisor và executive đã có quyền đọc tất cả phòng ban (fix ở Slice C), nhưng không có link trong nav → phải gõ URL tay.

## Slice

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | Không |
| UI | `frontend/components/layout/AppShell.tsx` — thêm entry `nav.direction` cho `['supervisor', 'executive']` |

## Implementation notes
```ts
// Thêm vào LINKS array sau entry direction của employee/leader:
{ key: 'nav.direction', href: '/direction', roles: ['supervisor', 'executive'] },
```
Vì supervisor/executive không edit được, chỉ đọc — direction page đã xử lý logic `canEdit` đúng rồi.

## Test steps
1. Login supervisor → kiểm tra nav có link "Định hướng phòng ban"
2. Click vào → thấy dept selector (browse all depts)
3. Login executive → tương tự
4. Login employee → vẫn thấy link (không bị ảnh hưởng)

## Done when
- [x] Supervisor thấy direction link trong sidebar
- [x] Executive thấy direction link trong sidebar
- [x] Employee/leader không bị ảnh hưởng
