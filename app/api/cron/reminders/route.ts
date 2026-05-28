import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET(req: NextRequest) {
  // Vercel sets CRON_SECRET and passes it as Bearer token on each cron invocation
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const employees = await prisma.user.findMany({
      where: { role: 'employee', isActive: true },
      select: { id: true, fullName: true, email: true },
    });

    if (employees.length === 0) {
      return NextResponse.json({ message: 'No active employees found.', missing: [] });
    }

    const reporterRows = await prisma.report.findMany({
      where: { createdAt: { gte: todayUtc } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const reporterIds = new Set(reporterRows.map((r) => r.userId));

    const missing = employees.filter((e) => !reporterIds.has(e.id));

    if (missing.length > 0 && process.env.SMTP_HOST) {
      await sendReminderEmail(missing);
    }

    return NextResponse.json({
      checked: employees.length,
      missing: missing.length,
      names: missing.map((e) => e.fullName),
    });
  } catch (err) {
    console.error('[Reminder cron] error', err);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

async function sendReminderEmail(missing: Array<{ fullName: string; email: string }>) {
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  const names = missing.map((e) => `- ${e.fullName} (${e.email})`).join('\n');
  const to = process.env.SMTP_NOTIFY_TO ?? process.env.SMTP_USER ?? '';

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `[One Report] ${missing.length} nhân viên chưa nộp báo cáo hôm nay`,
    text: `Danh sách nhân viên chưa nộp báo cáo hôm nay:\n\n${names}`,
  });
}
