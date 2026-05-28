# [004] Thiếu translation key cho source type "task_tracker"

**Label:** Done  
**Blocked by:** (none)

## Problem
`SourceType` đã có giá trị `'task_tracker'` nhưng `translations.ts` chỉ define:
```ts
'source.text': 'văn bản',
'source.voice': 'giọng nói',
```
Khi history page gọi `t('source.task_tracker')`, i18n fallback trả về key thô `"source.task_tracker"` thay vì label đọc được.

## Slice

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | Không |
| UI | `frontend/lib/i18n/translations.ts` — thêm key `source.task_tracker` vào cả `vi` và `en` |

## Implementation notes
```ts
// vi:
'source.task_tracker': 'Task Tracker',

// en:
'source.task_tracker': 'Task Tracker',
```
(Tên riêng "Task Tracker" không cần dịch)

## Test steps
1. Submit 1 báo cáo qua Paste Task Tracker tab
2. Vào `/history`
3. Cột "Loại" hiện "Task Tracker" thay vì "source.task_tracker"

## Done when
- [x] `source.task_tracker` có giá trị trong cả vi + en locale
- [x] History page hiển thị đúng label
