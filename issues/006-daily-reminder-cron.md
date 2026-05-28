# [006] Nhắc nhở hằng ngày cho nhân viên chưa nộp báo cáo

**Label:** Human loop  
**Blocked by:** (none)

## Problem
Nhân viên hay quên nộp báo cáo cuối ngày. Hiện chỉ supervisor/leader nhìn vào dashboard mới biết ai chưa nộp — không có cơ chế push tự động.

## Decision needed (Human loop)
1. **Kênh thông báo**: Email (cần SMTP config) hay in-app notification (cần notification model + polling/WebSocket)?  
2. **Thời điểm**: Gửi lúc mấy giờ? Timezone nào?  
3. **Scope**: Chỉ nhắc employee, hay cả leader?  
4. **Opt-out**: Nhân viên có thể tắt được không?  
5. **Tần suất**: 1 lần/ngày, hay nhắc lần 2 trước cuối giờ?

## Proposed slice (sau khi có decision — giả sử email)

| Layer | Change |
|-------|--------|
| Schema | Thêm `UserNotificationPreference` model (opt-out flag) — optional |
| API | NestJS `@Cron('0 16 * * 1-5')` trong `NotificationModule` — gọi `missingReports()`, gửi email từng người |
| UI | Không cần UI mới; supervisor dashboard "Chưa nộp" list đủ làm confirmation |

## Test steps
1. Trigger cron manually (test endpoint hoặc unit test)
2. Kiểm tra email gửi đến đúng địa chỉ nhân viên chưa nộp
3. Nhân viên đã nộp → không nhận email

## Done when
- [ ] Cron chạy đúng giờ (hoặc manually triggerable)
- [ ] Email/notification gửi đúng người
- [ ] Nhân viên đã nộp bị loại đúng
