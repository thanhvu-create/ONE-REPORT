import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
}

const base =
  'inline-flex max-w-full items-center justify-center rounded-sm px-[22px] py-[14px] text-center font-body text-xs uppercase leading-tight tracking-eyebrow transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-hp-ink text-hp-foundation hover:bg-hp-pink',
  secondary: 'bg-transparent border border-hp-ink text-hp-ink hover:bg-hp-ink hover:text-hp-foundation',
  destructive: 'bg-transparent border border-hp-pink text-hp-pink hover:bg-hp-ink hover:text-hp-foundation hover:border-hp-ink',
  ghost: 'bg-transparent text-hp-muted hover:text-hp-ink',
};

export const HpButton = forwardRef<HTMLButtonElement, Props>(function HpButton(
  { variant = 'primary', loading, loadingLabel, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className ?? ''}`}
      {...rest}
    >
      {loading ? (loadingLabel ?? 'Working…') : children}
    </button>
  );
});
