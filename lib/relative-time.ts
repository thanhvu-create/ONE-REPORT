type T = (key: string, vars?: Record<string, string | number>) => string;

/** Compact "vừa xong / X phút trước / X giờ trước / X ngày trước". */
export function relativeTime(t: T, iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('dashboard.time_just_now');
  if (minutes < 60) return t('dashboard.time_minutes', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('dashboard.time_hours', { n: hours });
  const days = Math.floor(hours / 24);
  return t('dashboard.time_days', { n: days });
}
