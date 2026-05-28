'use client';

import { DeptHeatmapResponse } from '@/lib/types';

const URGENT_BG = (n: number) =>
  n === 0 ? '' : n >= 5 ? 'bg-hp-pink/90 text-white' : n >= 3 ? 'bg-hp-pink/50' : 'bg-hp-pink/20';

const HIGH_BG = (n: number) =>
  n === 0 ? '' : n >= 5 ? 'bg-orange-400/80 text-white' : n >= 3 ? 'bg-orange-300/60' : 'bg-orange-200/40';

const BLOCKER_BG = (n: number) =>
  n === 0 ? '' : n >= 5 ? 'bg-red-500/80 text-white' : n >= 3 ? 'bg-red-300/60' : 'bg-red-100/70';

export function DeptHeatmap({ data }: { data: DeptHeatmapResponse | undefined }) {
  const rows = data?.departments ?? [];

  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-6">
      <h3 className="font-title text-xl text-hp-ink mb-1">Phân bổ ưu tiên theo phòng ban</h3>
      <p className="eyebrow text-xs mb-4">Màu đậm = nhiều vấn đề hơn</p>

      {rows.length === 0 && (
        <p className="text-sm text-hp-muted py-4">Chưa có dữ liệu trong kỳ này.</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto -mx-5 sm:-mx-6">
          <table className="w-full min-w-[560px] border-collapse text-sm px-5 sm:px-6">
            <thead>
              <tr className="bg-hp-inset border-b border-hp-rule">
                <th className="text-left eyebrow py-2 px-4 font-normal">Phòng ban</th>
                <th className="text-right eyebrow py-2 px-3 font-normal w-16">Tổng</th>
                <th className="text-right eyebrow py-2 px-3 font-normal w-20 text-hp-pink">Khẩn cấp</th>
                <th className="text-right eyebrow py-2 px-3 font-normal w-16 text-orange-600">Cao</th>
                <th className="text-right eyebrow py-2 px-3 font-normal w-20">Trung bình</th>
                <th className="text-right eyebrow py-2 px-3 font-normal w-14">Thấp</th>
                <th className="text-right eyebrow py-2 px-3 font-normal w-20 text-red-600">Blocker</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.department_id)} className="border-b border-hp-rule last:border-0">
                  <td className="py-2.5 px-4 font-body text-hp-ink">
                    {r.department_name ?? '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-hp-ink">
                    {r.total}
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums ${URGENT_BG(r.urgent)}`}>
                    {r.urgent || <span className="text-hp-rule">—</span>}
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums ${HIGH_BG(r.high)}`}>
                    {r.high || <span className="text-hp-rule">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-hp-body">
                    {r.medium || <span className="text-hp-rule">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-hp-muted">
                    {r.low || <span className="text-hp-rule">—</span>}
                  </td>
                  <td className={`py-2.5 px-3 text-right tabular-nums ${BLOCKER_BG(r.blockers)}`}>
                    {r.blockers || <span className="text-hp-rule">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
