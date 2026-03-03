import { useState } from 'react';
import type { Locale } from '../../../site.config';
import { t } from '../../i18n';
import { buildJoinUrl } from '../../lib/join-by-code';

interface JoinByCodeProps {
  locale: Locale;
}

export function JoinByCode({ locale }: JoinByCodeProps) {
  const [code, setCode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = buildJoinUrl(code, locale);
    if (url) {
      window.location.href = url;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-xs gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t('hero.joinPlaceholder', locale)}
        className="flex-1 rounded-lg border border-border bg-bg-input px-3 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!code.trim()}
        className="rounded-lg bg-bg-card px-4 py-2.5 text-sm font-semibold text-text border border-border transition-colors hover:bg-bg-input disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t('hero.joinLink', locale)}
      </button>
    </form>
  );
}
