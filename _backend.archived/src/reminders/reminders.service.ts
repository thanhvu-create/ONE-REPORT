import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 1 * * *')
  async checkMissingReports() {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const employees = await this.prisma.user.findMany({
      where: { role: 'employee', isActive: true },
      select: { id: true, fullName: true, email: true },
    });

    if (employees.length === 0) {
      this.logger.log('[Reminder] No active employees found.');
      return;
    }

    const reporterIds = await this.prisma.report
      .findMany({
        where: { createdAt: { gte: todayUtc } },
        select: { userId: true },
        distinct: ['userId'],
      })
      .then((rows) => new Set(rows.map((r) => r.userId)));

    const missing = employees.filter((e) => !reporterIds.has(e.id));

    if (missing.length === 0) {
      this.logger.log('[Reminder] All employees reported.');
    } else {
      const names = missing.map((e) => e.fullName).join(', ');
      this.logger.warn(`[Reminder] Missing reports today: ${names}`);
    }

    if (process.env.SMTP_HOST && missing.length > 0) {
      await this.sendReminderEmail(missing).catch((err) =>
        this.logger.error('[Reminder] Email send failed', err),
      );
    }
  }

  private async sendReminderEmail(
    missing: Array<{ fullName: string; email: string }>,
  ) {
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

    this.logger.log(`[Reminder] Email sent to ${to} for ${missing.length} missing reporter(s).`);
  }
}
