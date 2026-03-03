import { describe, it, expect } from 'vitest';
import { GENRES, getGenreLabel, getGenreColor, matchGenre } from '../genres';

describe('genres', () => {
  it('GENRES is a non-empty array of strings', () => {
    expect(Array.isArray(GENRES)).toBe(true);
    expect(GENRES.length).toBeGreaterThan(0);
    GENRES.forEach((genre) => {
      expect(typeof genre).toBe('string');
    });
  });

  it('getGenreLabel returns a label for every genre', () => {
    GENRES.forEach((genre) => {
      const label = getGenreLabel(genre);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('getGenreColor returns Tailwind classes for every genre', () => {
    GENRES.forEach((genre) => {
      const color = getGenreColor(genre);
      expect(color).toContain('bg-');
      expect(color).toContain('text-');
    });
  });

  it('getGenreColor returns fallback for unknown genre', () => {
    const color = getGenreColor('nonexistent' as never);
    expect(color).toContain('bg-');
    expect(color).toContain('text-');
  });
});

describe('matchGenre', () => {
  it('matches exact genre slug', () => {
    expect(matchGenre(['rock'])).toBe('rock');
  });

  it('matches via alias (hip hop -> hip-hop)', () => {
    expect(matchGenre(['hip hop'])).toBe('hip-hop');
  });

  it('returns first matching genre by tag priority', () => {
    expect(matchGenre(['indie rock', 'rock', 'alternative'])).toBe('indie');
  });

  it('returns null when no tags match', () => {
    expect(matchGenre(['seen live', 'favorites', 'my playlist'])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(matchGenre([])).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(matchGenre(['ROCK'])).toBe('rock');
    expect(matchGenre(['Hip-Hop'])).toBe('hip-hop');
  });

  it('matches r&b variants', () => {
    expect(matchGenre(['rnb'])).toBe('r&b');
    expect(matchGenre(['rhythm and blues'])).toBe('r&b');
  });

  it('matches electronic variants', () => {
    expect(matchGenre(['edm'])).toBe('electronic');
    expect(matchGenre(['drum and bass'])).toBe('electronic');
    expect(matchGenre(['techno'])).toBe('electronic');
  });
});
