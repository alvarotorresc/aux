import type { Locale } from '../../../site.config';
import type { Round } from '../../lib/types';
import { t } from '../../i18n';

interface RoundInfoProps {
  round: Round;
  songCount: number;
  songsPerRound: number;
  locale: Locale;
}

/** Map our Locale type to a BCP 47 tag for Intl APIs. */
const localeTag: Record<Locale, string> = { en: 'en-US', es: 'es-ES' };

/** Format a date string to short human-readable form (e.g. "Feb 24" / "24 feb"). */
function formatShortDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return date.toLocaleDateString(localeTag[locale], { month: 'short', day: 'numeric' });
}

/**
 * Accent-colored bar showing current round number, date range, and song counter.
 */
export function RoundInfo({ round, songCount, songsPerRound, locale }: RoundInfoProps) {
  return (
    <div className="flex items-center justify-between border-b border-accent/15 bg-accent-soft px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-accent">
          {t('group.round', locale)} {round.number}
        </span>
        <span className="text-sm text-text-tertiary">
          {formatShortDate(round.starts_at, locale)} &mdash;{' '}
          {formatShortDate(round.ends_at, locale)}
        </span>
      </div>
      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-xs font-medium text-accent">
        {songCount}/{songsPerRound} {t('group.songs_count', locale)}
      </span>
    </div>
  );
}
