function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-9 w-9 text-[10px]' : 'h-11 w-11 text-xs';
  return (
    <span
      className={`${dim} shrink-0 inline-flex items-center justify-center rounded-full border border-hp-rule bg-hp-inset font-body uppercase tracking-wider text-hp-ink`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
