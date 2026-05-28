# [007] Export danh sách báo cáo ra CSV

**Label:** Done  
**Blocked by:** (none)

## Problem
Supervisor và executive hiện không thể extract dữ liệu ra ngoài để phân tích (Excel, BI tool).  
Phải export thủ công hoặc query DB trực tiếp.

## Decision needed (Human loop)
1. **Roles có quyền export**: Chỉ supervisor + admin, hay executive cũng có?  
2. **Scope của export**: Theo filter hiện tại trên trang, hay toàn bộ?  
3. **Fields trong CSV**: Tất cả fields, hay chỉ subset (id, user, dept, date, priority, status, hasBlocker)?  
4. **Format**: CSV thuần, hay Excel (.xlsx)?  
5. **Size limit**: Giới hạn bao nhiêu dòng? (tránh timeout)

## Proposed slice (sau khi có decision — giả sử CSV, supervisor+admin, theo filter)

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | `GET /reports/export?[same filters as list]` — stream CSV response với header `Content-Disposition: attachment` |
| UI | `frontend/app/supervisor/reports/page.tsx` — thêm nút "Export CSV" build URL từ query state hiện tại |

## Test steps
1. Login supervisor → filter theo department + date range
2. Click "Export CSV"
3. File download đúng tên, đúng số dòng, đúng fields
4. Mở trong Excel → không lỗi encoding (UTF-8 BOM)

## Done when
- [ ] Endpoint trả CSV với đúng filter
- [ ] UTF-8 BOM để Excel đọc được tiếng Việt
- [ ] Nút export hiển thị trên supervisor/reports
