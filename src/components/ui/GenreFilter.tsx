import type { Locale } from '../../../site.config';
import { GENRES, getGenreLabel } from '../../lib/genres';
import { t } from '../../i18n';

interface GenreFilterProps {
  value: string | null;
  onChange: (genre: string | null) => void;
  locale: Locale;
}

export function GenreFilter({ value, onChange, locale }: GenreFilterProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={t('leaderboard.genreFilter', locale)}
      className="rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text"
    >
      <option value="">{t('leaderboard.allGenres', locale)}</option>
      {GENRES.map((g) => (
        <option key={g} value={g}>
          {getGenreLabel(g)}
        </option>
      ))}
    </select>
  );
}
