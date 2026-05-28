'use client';

import { UserAvatar } from '@/components/admin/UserAvatar';
import { Department } from '@/lib/types';
import { useT } from '@/lib/i18n/locale-context';

export type OccupancyFilter = '' | 'has_users' | 'empty';

export interface DepartmentRow extends Department {
  userCount: number;
}

interface Props {
  filtered: DepartmentRow[];
  total: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  occupancy: OccupancyFilter;
  onOccupancyChange: (v: OccupancyFilter) => void;
  selectedId: number | null;
  onSelect: (d: DepartmentRow) => void;
}

export function DepartmentDirectory({
  filtered,
  total,
  isLoading,
  search,
  onSearchChange,
  occupancy,
  onOccupancyChange,
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
          placeholder={t('depts.search_placeholder')}
          className="h-9 w-full min-w-0 flex-1 bg-transparent border border-hp-rule px-3 text-sm text-hp-body font-body placeholder:text-hp-muted focus:outline-none focus:border-hp-pink sm:max-w-xs"
        />
        <select
          value={occupancy}
          onChange={(e) => onOccupancyChange(e.target.value as OccupancyFilter)}
          aria-label={t('depts.filter_occupancy')}
          className={selectClass}
        >
          <option value="">{t('depts.filter_occupancy')}: {t('common.all')}</option>
          <option value="has_users">{t('depts.filter_has_users')}</option>
          <option value="empty">{t('depts.filter_empty')}</option>
        </select>
        <span className="text-[10px] uppercase tracking-eyebrow text-hp-muted tabular-nums sm:ml-auto">
          {filtered.length}/{total}
        </span>
      </div>

      {isLoading && (
        <p className="eyebrow py-10 text-center text-hp-muted">{t('common.loading')}</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-hp-muted">{t('depts.empty_search')}</p>
      )}

      {/* Desktop table */}
      {!isLoading && filtered.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-hp-inset/80 border-b border-hp-rule">
                <th className="text-left eyebrow py-2.5 pl-4 pr-2 font-normal">{t('depts.col_name')}</th>
                <th className="text-left eyebrow py-2.5 px-2 font-normal">{t('depts.col_description')}</th>
                <th className="text-right eyebrow py-2.5 px-2 font-normal w-24">{t('depts.col_users')}</th>
                <th className="text-left eyebrow py-2.5 px-2 font-normal w-28 hidden lg:table-cell">{t('depts.col_created')}</th>
                <th className="w-16 py-2.5 pr-4" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <DepartmentTableRow
                  key={d.id}
                  dept={d}
                  selected={selectedId === d.id}
                  onSelect={() => onSelect(d)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile compact list */}
      {!isLoading && filtered.length > 0 && (
        <ul className="md:hidden divide-y divide-hp-rule">
          {filtered.map((d) => (
            <li key={d.id}>
              <DepartmentCompactRow dept={d} selected={selectedId === d.id} onSelect={() => onSelect(d)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CountBadge({ value, empty }: { value: number; empty: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[28px] h-6 px-2 text-[11px] tabular-nums border ${
        empty ? 'border-hp-rule text-hp-muted' : 'border-hp-ink/30 text-hp-ink bg-hp-inset/60'
      }`}
    >
      {value}
    </span>
  );
}

function DepartmentTableRow({
  dept,
  selected,
  onSelect,
}: {
  dept: DepartmentRow;
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
          <UserAvatar name={dept.name} size="sm" />
          <span className="text-hp-ink truncate font-body">{dept.name}</span>
        </div>
      </td>
      <td className="py-2.5 px-2 text-hp-muted truncate max-w-[320px]">
        {dept.description || <span className="text-hp-muted/60">{t('common.dash')}</span>}
      </td>
      <td className="py-2.5 px-2 text-right">
        <CountBadge value={dept.userCount} empty={dept.userCount === 0} />
      </td>
      <td className="py-2.5 px-2 text-hp-body text-xs hidden lg:table-cell tabular-nums">
        {new Date(dept.createdAt).toLocaleDateString()}
      </td>
      <td className="py-2.5 pr-4 text-right">
        <span className="eyebrow text-[10px] text-hp-muted opacity-0 group-hover:opacity-100 transition-opacity">
          {t('common.edit')}
        </span>
      </td>
    </tr>
  );
}

function DepartmentCompactRow({
  dept,
  selected,
  onSelect,
}: {
  dept: DepartmentRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-colors ${
        selected ? 'bg-hp-inset/80' : 'active:bg-hp-inset/50'
      }`}
    >
      <UserAvatar name={dept.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span className="text-sm text-hp-ink truncate">{dept.name}</span>
          <CountBadge value={dept.userCount} empty={dept.userCount === 0} />
        </div>
        <p className="text-[11px] text-hp-muted truncate leading-snug">
          {dept.description || t('depts.no_description')}
        </p>
      </div>
    </button>
  );
}
