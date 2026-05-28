'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { DirectionAdjustmentItem, REVIEW_PERIOD_LABELS } from '@/lib/types';

export function DirectionAdjustmentPanel() {
  const { data: items, isLoading } = useSWR<DirectionAdjustmentItem[]>(
    '/dashboard/direction-adjustments?limit=10',
    swrFetcher,
    { refreshInterval: 60_000 },
  );

  return (
    <div className="border border-yellow-300 bg-yellow-50">
      <div className="px-5 py-4 border-b border-yellow-200 flex items-center justify-between">
        <div>
          <p className="eyebrow text-xs text-yellow-700">Yêu cầu điều chỉnh chiến lược</p>
          <p className="font-title text-lg text-hp-ink mt-0.5">Điều chỉnh Định hướng</p>
        </div>
        {items && items.length > 0 && (
          <span className="eyebrow text-xs px-3 py-1 bg-yellow-300 text-yellow-900">
            {items.length}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        {isLoading && <p className="text-sm text-hp-muted">Đang tải...</p>}

        {!isLoading && (!items || items.length === 0) && (
          <p className="text-sm text-hp-muted">
            Không có yêu cầu điều chỉnh định hướng nào đang mở.
          </p>
        )}

        {items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.report_id} className="border-l-4 border-yellow-400 pl-3 py-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-hp-ink">{item.employee_name}</p>
                    <p className="text-xs text-hp-muted mt-0.5">
                      {item.department_name ?? '—'}
                      {item.review_period && (
                        <> · {REVIEW_PERIOD_LABELS[item.review_period]}</>
                      )}
                      {' · '}
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </p>
                    {item.adjustment_details && (
                      <p className="text-sm text-hp-body mt-1 line-clamp-2">
                        {item.adjustment_details}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/reports/${item.report_id}`}
                    className="shrink-0 eyebrow text-xs text-hp-muted hover:text-hp-ink whitespace-nowrap"
                  >
                    Xem →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items && items.length > 0 && (
          <p className="mt-4 text-xs text-hp-muted">
            Mở từng báo cáo để xem chi tiết và cập nhật định hướng phòng ban nếu cần.
          </p>
        )}
      </div>
    </div>
  );
}
