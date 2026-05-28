import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiError } from '@/lib/server/auth';
import { listReports, ListQuery } from '@/lib/server/reports';
import { handleError } from '@/lib/server/route';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!['supervisor', 'executive', 'admin'].includes(user.role)) {
      throw apiError(403, 'Only supervisor, executive, and admin can export reports');
    }
    const sp = req.nextUrl.searchParams;
    const query: ListQuery = {
      reportType: sp.get('reportType') ?? undefined,
      departmentId: sp.get('departmentId') ?? undefined,
      dateFrom: sp.get('dateFrom') ?? undefined,
      dateTo: sp.get('dateTo') ?? undefined,
      limit: '2000',
      offset: '0',
    };
    const { items } = await listReports(user, query);

    const header = 'ID,Ngày,Nhân viên,Phòng ban,Loại,Nguồn,Ưu tiên,Trạng thái,Blocker,Flag\n';
    const rows = items.map((r: any) => {
      const cells = [
        r.id,
        new Date(r.createdAt).toLocaleString('vi-VN'),
        `"${r.user.fullName.replace(/"/g, '""')}"`,
        `"${(r.department?.name ?? '').replace(/"/g, '""')}"`,
        r.reportType === 'status_report' ? 'Trạng thái' : 'Đánh giá',
        r.sourceType,
        r.aiPriority ?? '',
        r.status,
        r.hasBlocker ? 'Có' : 'Không',
        r.isFlagged ? 'Có' : 'Không',
      ];
      return cells.join(',');
    });

    const csv = '﻿' + header + rows.join('\n');
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reports-${date}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
