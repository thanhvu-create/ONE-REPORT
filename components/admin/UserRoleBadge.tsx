import { Role } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

const styles: Record<Role, string> = {
  admin:       'border-hp-pink text-hp-pink bg-hp-pink/5',
  executive:   'border-hp-ink text-hp-ink bg-hp-ink/5',
  supervisor:  'border-orange-400 text-orange-700 bg-orange-50',
  leader:      'border-blue-400 text-blue-700 bg-blue-50',
  employee:    'border-hp-rule text-hp-body bg-hp-card',
  manager:     'border-hp-ink text-hp-ink bg-hp-inset',
};

export function UserRoleBadge({ role }: { role: Role }) {
  const t = useT();
  return (
    <span className={`inline-block uppercase tracking-eyebrow text-[10px] px-2 py-1 border ${styles[role]}`}>
      {t(`role.${role}`)}
    </span>
  );
}
