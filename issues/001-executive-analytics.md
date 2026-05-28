# [001] Executive analytics — thêm PriorityBars + TopContributors vào executive dashboard

**Label:** Done  
**Blocked by:** (none)

## Problem
`/executive/dashboard` hiện chỉ hiện KPI cards + trend + missing reporters + activity feed.  
Supervisor dashboard đã có PriorityBars, TopContributors, DeptHeatmap — executive cần tập con tương tự (không cần DeptHeatmap vì đã có dept table).

## Slice

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | Endpoints đã có: `/dashboard/priority-distribution`, `/dashboard/top-contributors`. Guard đã fix ở Slice E |
| UI | `frontend/app/executive/dashboard/page.tsx` — thêm import + useSWR + render PriorityBars + TopContributors |

## Implementation notes
- Import `PriorityBars` từ `@/components/dashboard/PriorityBars`
- Import `TopContributors` từ `@/components/dashboard/TopContributors`
- Thêm type imports: `PriorityDistribution`, `TopContributorsResponse`
- useSWR với period param (executive dùng `period = 'week'` như hiện tại)
- Đặt 2 panels dạng `grid lg:grid-cols-2` phía trên ActivityFeed

## Test steps
1. Login account executive (ví dụ `executive@ctyhp.vn`)
2. Vào `/executive/dashboard`
3. Kiểm tra PriorityBars hiển thị đúng số liệu
4. Kiểm tra TopContributors hiển thị top reporters

## Done when
- [x] PriorityBars render trên executive dashboard với dữ liệu thật
- [x] TopContributors render trên executive dashboard với dữ liệu thật
- [x] Không có console error / TypeScript error
