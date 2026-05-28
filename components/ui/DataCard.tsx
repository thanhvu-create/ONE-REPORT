interface DataCardProps {
  children: React.ReactNode;
  className?: string;
}

export function DataCard({ children, className }: DataCardProps) {
  return (
    <article className={`bg-hp-card border border-hp-rule p-4 sm:p-5 ${className ?? ''}`}>{children}</article>
  );
}

interface MetaRowProps {
  label: string;
  children: React.ReactNode;
}

export function MetaRow({ label, children }: MetaRowProps) {
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-hp-rule py-2.5 last:border-0 sm:grid-cols-[minmax(7rem,32%)_1fr] sm:gap-3">
      <span className="eyebrow">{label}</span>
      <div className="min-w-0 text-sm text-hp-body break-words">{children}</div>
    </div>
  );
}
