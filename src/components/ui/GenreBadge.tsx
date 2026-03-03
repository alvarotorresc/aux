import { GENRES, getGenreColor, getGenreLabel, type Genre } from '../../lib/genres';

interface GenreBadgeProps {
  genre: string | null;
}

const genreSet = new Set<string>(GENRES);

function isGenre(value: string): value is Genre {
  return genreSet.has(value);
}

/** Colored badge/chip for a music genre. Renders nothing if genre is null. */
export function GenreBadge({ genre }: GenreBadgeProps) {
  if (!genre) return null;

  const known = isGenre(genre);
  const colorClasses = known ? getGenreColor(genre) : getGenreColor('other');
  const label = known ? getGenreLabel(genre) : genre;

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses}`}>
      {label}
    </span>
  );
}
