# [005] Ghi chú khi giải quyết báo cáo (resolve note)

**Label:** Done  
**Blocked by:** (none)

## Problem
Khi supervisor/admin mark một báo cáo là "resolved", hiện không có cách ghi lý do / hành động đã xử lý.  
Không có audit trail → executive nhìn vào không biết vấn đề được giải quyết như thế nào.

## Decision needed (Human loop)
1. **Schema**: Thêm field `resolvedNote: String?` và `resolvedById: Int?` + `resolvedAt: DateTime?` vào model `Report`?  
   → Hay chỉ cần `resolvedNote` là đủ?
2. **UX**: Khi bấm "Giải quyết" trong detail page, hiện inline textarea để nhập note — hay popup modal?
3. **Bắt buộc hay optional**: Note có bắt buộc không?

## Proposed slice (sau khi có decision)

| Layer | Change |
|-------|--------|
| Schema | `Report`: thêm `resolvedNote String?`, `resolvedAt DateTime?`, `resolvedById Int?` → migration |
| API | `PATCH /reports/:id/status` — nhận thêm optional field `note` khi status = 'resolved' |
| UI | `frontend/app/reports/[id]/page.tsx` — thêm textarea trước nút Giải quyết; hiển thị resolvedNote nếu có |

## Test steps
1. Login supervisor → mở report detail
2. Click "Giải quyết" → textarea xuất hiện
3. Nhập note → confirm → status chuyển resolved, note hiển thị trên detail page
4. Executive xem same report → thấy note

## Done when
- [ ] resolvedNote lưu được vào DB
- [ ] Detail page hiển thị note khi report đã resolved
- [ ] Executive/supervisor đều thấy note
