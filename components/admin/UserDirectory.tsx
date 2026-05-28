'use client';

import { UserAvatar } from '@/components/admin/UserAvatar';
import { Role, UserRecord } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

type StatusFilter = '' | 'active' | 'inactive';

const roleTone: Record<Role, string> = {
  admin:      'text-hp-pink',
  executive:  'text-hp-ink font-medium',
  supervisor: 'text-orange-600',
  manager:    'text-hp-ink',
  leader:     'text-blue-600',
  employee:   'text-hp-body',
};

interface Props {
  filtered: UserRecord[];
  total: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  roleFilter: Role | '';
  onRoleFilterChange: (v: Role | '') => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  selectedId: number | null;
  onSelect: (u: UserRecord) => void;
}

export function UserDirectory({
  filtered,
  total,
  isLoading,
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  selectedId,
  onSelect,
}: Props) {
  const t = useT();

  const selectClass =
    'h-9 min-w-0 bg-hp-inset border border-hp-rule px-2.5 text-xs text-hp-body font-body focus:outline-none focus:border-hp-pink';

  return (
    <div className="bg-hp-card border border-hp-rule overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 border-b border-hp-rule p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('users.search_placeholder')}
          className="h-9 w-full min-w-0 flex-1 bg-transparent border border-hp-rule px-3 text-sm text-hp-body font-body placeholder:text-hp-muted focus:outline-none focus:border-hp-pink sm:max-w-xs"
        />
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value as Role | '')}
            aria-label={t('users.filter_role')}
            className={selectClass}
          >
            <option value="">{t('users.filter_role')}: {t('common.all')}</option>
            <option value="employee">{t('role.employee')}</option>
            <option value="leader">{t('role.leader')}</option>
            <option value="supervisor">{t('role.supervisor')}</option>
            <option value="executive">{t('role.executive')}</option>
            <option value="admin">{t('role.admin')}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            aria-label={t('users.filter_status')}
            className={selectClass}
          >
            <option value="">{t('common.all')}</option>
            <option value="active">{t('users.filter_status_active')}</option>
            <option value="inactive">{t('users.filter_status_inactive')}</option>
          </select>
        </div>
        <span className="text-[10px] uppercase tracking-eyebrow text-hp-muted tabular-nums sm:ml-auto">
          {filtered.length}/{total}
        </span>
      </div>

      {isLoading && (
        <p className="eyebrow py-10 text-center text-hp-muted">{t('common.loading')}</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-hp-muted">{t('users.empty_search')}</p>
      )}

      {/* Desktop table */}
      {!isLoading && filtered.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-hp-inset/80 border-b border-hp-rule">
                <th className="text-left eyebrow py-2.5 pl-4 pr-2 font-normal">{t('users.col_name')}</th>
                <th className="text-left eyebrow py-2.5 px-2 font-normal">{t('users.col_email')}</th>
                <th className="text-left eyebrow py-2.5 px-2 font-normal hidden lg:table-cell">{t('users.col_dept')}</th>
                <th className="text-left eyebrow py-2.5 px-2 font-normal w-24">{t('users.col_role')}</th>
                <th className="text-center eyebrow py-2.5 px-2 font-normal w-16">{t('users.col_active')}</th>
                <th className="w-16 py-2.5 pr-4" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <UserTableRow
                  key={u.id}
                  user={u}
                  selected={selectedId === u.id}
                  onSelect={() => onSelect(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile compact list */}
      {!isLoading && filtered.length > 0 && (
        <ul className="md:hidden divide-y divide-hp-rule">
          {filtered.map((u) => (
            <li key={u.id}>
              <UserCompactRow user={u} selected={selectedId === u.id} onSelect={() => onSelect(u)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusDot({ active }: { active: boolean }) {
  const t = useT();
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-hp-ink' : 'bg-hp-rule'}`}
      title={active ? t('users.status_active') : t('users.status_inactive')}
      aria-label={active ? t('users.status_active') : t('users.status_inactive')}
    />
  );
}

function UserTableRow({
  user: u,
  selected,
  onSelect,
}: {
  user: UserRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  return (
    <tr
      className={`group border-b border-hp-rule last:border-b-0 cursor-pointer transition-colors ${
        selected ? 'bg-hp-inset/80' : 'hover:bg-hp-inset/40'
      }`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      tabIndex={0}
      role="button"
    >
      <td className="py-2.5 pl-4 pr-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar name={u.fullName} size="sm" />
          <span className="text-hp-ink truncate font-body">{u.fullName}</span>
        </div>
      </td>
      <td className="py-2.5 px-2 text-hp-muted truncate max-w-[200px]">{u.email}</td>
      <td className="py-2.5 px-2 text-hp-body truncate hidden lg:table-cell max-w-[140px]">
        {u.department?.name ?? t('common.dash')}
      </td>
      <td className={`py-2.5 px-2 uppercase tracking-eyebrow text-[10px] ${roleTone[u.role]}`}>
        {t(`role.${u.role}`)}
      </td>
      <td className="py-2.5 px-2 text-center">
        <StatusDot active={u.isActive} />
      </td>
      <td className="py-2.5 pr-4 text-right">
        <span className="eyebrow text-[10px] text-hp-muted opacity-0 group-hover:opacity-100 transition-opacity">
          {t('common.edit')}
        </span>
      </td>
    </tr>
  );
}

function UserCompactRow({
  user: u,
  selected,
  onSelect,
}: {
  user: UserRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const dept = u.department?.name ?? t('common.dash');
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
        selected ? 'bg-hp-inset/80' : 'active:bg-hp-inset/50'
      }`}
    >
      <UserAvatar name={u.fullName} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-hp-ink truncate">{u.fullName}</span>
          <StatusDot active={u.isActive} />
        </div>
        <p className="text-[11px] text-hp-muted truncate leading-snug">
          {u.email} · <span className={roleTone[u.role]}>{t(`role.${u.role}`)}</span> · {dept}
        </p>
      </div>
    </button>
  );
}
