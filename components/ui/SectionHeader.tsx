interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeader({ eyebrow, title, description }: Props) {
  return (
    <div className="mb-6 sm:mb-8">
      {eyebrow && <span className="block eyebrow mb-2">{eyebrow}</span>}
      <h2 className="font-title text-2xl text-hp-ink leading-tight break-words sm:text-[26px] lg:text-[28px]">{title}</h2>
      {description && <p className="mt-2 sm:mt-3 text-sm text-hp-body max-w-2xl break-words leading-relaxed">{description}</p>}
      <div className="mt-3 sm:mt-4 hp-divider" />
    </div>
  );
}
