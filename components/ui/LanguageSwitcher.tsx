'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import { LOCALES, LOCALE_SHORT, Locale } from '@/lib/i18n/translations';

interface Props {
  /** "inline" = compact text pair (used in sidebar), "card" = wider buttons (used on login). */
  variant?: 'inline' | 'card';
}

export function LanguageSwitcher({ variant = 'inline' }: Props) {
  const { locale, setLocale, t } = useLocale();

  if (variant === 'card') {
    return (
      <div className="flex items-center gap-1">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={locale === l}
            className={`uppercase tracking-eyebrow text-[10px] px-2 py-1 border transition-colors duration-150 ${
              locale === l
                ? 'border-hp-ink text-hp-ink bg-hp-card'
                : 'border-hp-rule text-hp-muted hover:text-hp-ink'
            }`}
          >
            {LOCALE_SHORT[l]}
          </button>
        ))}
      </div>
    );
  }

  // inline variant for sidebar
  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow">{t('common.language')}</span>
      <div className="flex items-center gap-1">
        {LOCALES.map((l: Locale, i) => (
          <span key={l} className="flex items-center">
            {i > 0 && <span className="text-hp-muted text-[10px] mx-1">·</span>}
            <button
              type="button"
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              className={`uppercase tracking-eyebrow text-[10px] transition-colors duration-150 ${
                locale === l ? 'text-hp-ink' : 'text-hp-muted hover:text-hp-ink'
              }`}
            >
              {LOCALE_SHORT[l]}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
