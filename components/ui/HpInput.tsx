import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const HpInput = forwardRef<HTMLInputElement, Props>(function HpInput(
  { label, helperText, error, id, className, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    <div className="mb-6">
      {label && (
        <label htmlFor={inputId} className="block eyebrow mb-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={`w-full bg-transparent border-0 border-b ${error ? 'border-hp-pink' : 'border-hp-rule'} px-0.5 py-1.5 text-hp-body font-body text-base focus:outline-none focus:border-b-2 focus:border-hp-pink focus:pb-[5px] transition-colors duration-150 ${className ?? ''}`}
        {...rest}
      />
      {helperText && !error && <p className="mt-1.5 text-xs text-hp-muted">{helperText}</p>}
      {error && <p className="mt-1.5 text-xs text-hp-pink">{error}</p>}
    </div>
  );
});
