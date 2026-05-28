interface Props {
  label: string;
  value: number | string;
  helper?: string;
  emphasis?: 'default' | 'pink';
}

export function KpiCard({ label, value, helper, emphasis = 'default' }: Props) {
  return (
    <div className="bg-hp-card border border-hp-rule p-5 sm:p-6 lg:p-7">
      <span className="block eyebrow mb-2 sm:mb-3">{label}</span>
      <span
        className={`font-title text-3xl sm:text-4xl tabular-nums ${
          emphasis === 'pink' ? 'text-hp-pink' : 'text-hp-ink'
        }`}
      >
        {value}
      </span>
      {helper && <p className="mt-2 text-xs text-hp-muted">{helper}</p>}
    </div>
  );
}
