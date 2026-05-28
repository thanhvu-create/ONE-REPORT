# [008] UX chọn loại báo cáo trước khi ghi âm

**Label:** Done  
**Blocked by:** (none)

## Problem
`POST /reports/voice` nhận param `reportType` (status_report | performance_review).  
Hiện tại submit pages ghi cứng loại — nhưng nếu user vào `/submit/status-report` rồi ghi âm về performance thì AI parse sai template.

Ngoài ra: không có route `/submit/voice` độc lập — user phải vào đúng tab trong đúng page.

## Decision needed (Human loop)
1. **UX flow**: 
   - Option A: Giữ nguyên — user chọn page trước (status vs performance), rồi dùng tab Voice trong đó → đơn giản nhưng cần user biết mình muốn nộp loại gì
   - Option B: Trang voice chung `/submit/voice` → chọn loại *sau* khi AI transcribe (AI suggest loại phù hợp) → thông minh hơn nhưng phức tạp hơn
   - Option C: Dropdown "Loại báo cáo" ngay trên voice recorder *trước* khi bấm record → rõ ràng nhất
2. **AI auto-detect**: Có muốn AI tự detect loại báo cáo từ transcript không?

## Proposed slice nếu chọn Option C (dropdown trước record)

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | `POST /reports/voice` đã nhận `reportType` param — không đổi |
| UI | Cả 2 submit pages: thêm `<select>` chọn reportType *trước* recorder; truyền giá trị vào FormData |

## Test steps
1. Vào `/submit/status-report` tab Ghi âm
2. Dropdown hiện "Trạng thái hạng mục" (pre-selected đúng page)
3. User có thể đổi sang "Đánh giá kết quả" trước khi record
4. Submit → AI parse đúng template

## Done when
- [ ] User không thể nhầm loại báo cáo khi ghi âm
- [ ] reportType được truyền đúng lên backend
