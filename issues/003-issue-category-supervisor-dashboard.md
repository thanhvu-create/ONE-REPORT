# [003] Wire IssueCategoryList vào supervisor dashboard

**Label:** Done  
**Blocked by:** (none)

## Problem
Component `IssueCategoryList` đã có nhưng không được dùng ở đâu.  
Backend endpoint `GET /dashboard/issue-categories` đã có.  
Type `IssueCategoryDistribution` được import trong component nhưng **chưa được define** trong `lib/types.ts` → TypeScript error.

## Slice

| Layer | Change |
|-------|--------|
| Schema | Không |
| API | Endpoint đã có: `GET /dashboard/issue-categories?period=&limit=` |
| UI — types | `frontend/lib/types.ts` — thêm `IssueCategoryDistribution` interface |
| UI — dashboard | `frontend/app/supervisor/dashboard/page.tsx` — thêm useSWR + render IssueCategoryList |

## Implementation notes

### Type cần thêm vào types.ts:
```ts
export interface IssueCategoryDistribution {
  period: DashboardPeriod;
  total_with_issues: number;
  buckets: Array<{ category: string; count: number }>;
}
```

### Supervisor dashboard:
- Import `IssueCategoryList` từ `@/components/dashboard/IssueCategoryList`
- Thêm `IssueCategoryDistribution` vào type imports
- useSWR: `/dashboard/issue-categories?period=${period}&limit=8`
- Đặt sau DeptHeatmap, trước dept summary table — hoặc trong analytics row thành 3 cột

## Test steps
1. Login supervisor → vào `/supervisor/dashboard`
2. Chọn period "7 ngày"
3. IssueCategoryList hiện danh sách loại blocker với progress bars

## Done when
- [x] `IssueCategoryDistribution` type được define trong types.ts
- [x] Component render đúng trên supervisor dashboard
- [x] Không còn TypeScript error về type missing
