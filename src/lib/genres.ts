export const GENRES = [
  'rock',
  'pop',
  'hip-hop',
  'electronic',
  'jazz',
  'classical',
  'r&b',
  'latin',
  'country',
  'metal',
  'indie',
  'folk',
  'punk',
  'reggae',
  'blues',
  'soul',
  'funk',
  'alternative',
  'other',
] as const;

export type Genre = (typeof GENRES)[number];

const GENRE_LABELS: Record<Genre, string> = {
  rock: 'Rock',
  pop: 'Pop',
  'hip-hop': 'Hip-Hop',
  electronic: 'Electronic',
  jazz: 'Jazz',
  classical: 'Classical',
  'r&b': 'R&B',
  latin: 'Latin',
  country: 'Country',
  metal: 'Metal',
  indie: 'Indie',
  folk: 'Folk',
  punk: 'Punk',
  reggae: 'Reggae',
  blues: 'Blues',
  soul: 'Soul',
  funk: 'Funk',
  alternative: 'Alternative',
  other: 'Other',
};

const GENRE_COLORS: Record<Genre, string> = {
  rock: 'bg-red-500/15 text-red-400',
  pop: 'bg-pink-500/15 text-pink-400',
  'hip-hop': 'bg-amber-500/15 text-amber-400',
  electronic: 'bg-cyan-500/15 text-cyan-400',
  jazz: 'bg-violet-500/15 text-violet-400',
  classical: 'bg-slate-500/15 text-slate-400',
  'r&b': 'bg-rose-500/15 text-rose-400',
  latin: 'bg-orange-500/15 text-orange-400',
  country: 'bg-yellow-500/15 text-yellow-400',
  metal: 'bg-zinc-500/15 text-zinc-400',
  indie: 'bg-teal-500/15 text-teal-400',
  folk: 'bg-lime-500/15 text-lime-400',
  punk: 'bg-fuchsia-500/15 text-fuchsia-400',
  reggae: 'bg-green-500/15 text-green-400',
  blues: 'bg-blue-500/15 text-blue-400',
  soul: 'bg-purple-500/15 text-purple-400',
  funk: 'bg-emerald-500/15 text-emerald-400',
  alternative: 'bg-indigo-500/15 text-indigo-400',
  other: 'bg-neutral-500/15 text-neutral-400',
};

const FALLBACK_COLOR = 'bg-neutral-500/15 text-neutral-400';

const TAG_ALIASES: Record<string, Genre> = {
  'hip hop': 'hip-hop',
  'hip-hop': 'hip-hop',
  hiphop: 'hip-hop',
  rap: 'hip-hop',
  trap: 'hip-hop',
  rnb: 'r&b',
  'r&b': 'r&b',
  'rhythm and blues': 'r&b',
  edm: 'electronic',
  house: 'electronic',
  techno: 'electronic',
  trance: 'electronic',
  dnb: 'electronic',
  'drum and bass': 'electronic',
  dubstep: 'electronic',
  synthpop: 'electronic',
  'indie rock': 'indie',
  'indie pop': 'indie',
  'alt-country': 'country',
  'death metal': 'metal',
  'black metal': 'metal',
  'heavy metal': 'metal',
  'thrash metal': 'metal',
  'nu metal': 'metal',
  'punk rock': 'punk',
  'post-punk': 'punk',
  'pop punk': 'punk',
  hardcore: 'punk',
  'alternative rock': 'alternative',
  'alt rock': 'alternative',
  grunge: 'alternative',
  'neo soul': 'soul',
  'bossa nova': 'latin',
  salsa: 'latin',
  reggaeton: 'latin',
  bachata: 'latin',
  cumbia: 'latin',
  'classic rock': 'rock',
  'hard rock': 'rock',
  'progressive rock': 'rock',
  'psychedelic rock': 'rock',
  'blues rock': 'blues',
  'folk rock': 'folk',
  acoustic: 'folk',
  'singer-songwriter': 'folk',
};

const genreSet = new Set<string>(GENRES);

export function getGenreLabel(genre: Genre): string {
  return GENRE_LABELS[genre];
}

export function getGenreColor(genre: Genre): string {
  return GENRE_COLORS[genre] ?? FALLBACK_COLOR;
}

export function matchGenre(tags: string[]): Genre | null {
  for (const tag of tags) {
    const normalized = tag.toLowerCase().trim();

    // 1. Check alias map
    const aliased = TAG_ALIASES[normalized];
    if (aliased) return aliased;

    // 2. Check exact match against GENRES
    if (genreSet.has(normalized)) return normalized as Genre;

    // 3. Check if tag contains a genre slug as substring
    for (const genre of GENRES) {
      if (normalized.includes(genre)) return genre;
    }
  }

  return null;
}
