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

  it('returns correct labels for specific genres', () => {
    expect(getGenreLabel('rock')).toBe('Rock');
    expect(getGenreLabel('hip-hop')).toBe('Hip-Hop');
    expect(getGenreLabel('r&b')).toBe('R&B');
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

  it('does not false-positive "popular" as "pop"', () => {
    expect(matchGenre(['popular'])).toBeNull();
  });

  it('does not false-positive "countryside" as "country"', () => {
    expect(matchGenre(['countryside'])).toBeNull();
  });

  it('does not false-positive "funky" as "funk"', () => {
    expect(matchGenre(['funky'])).toBeNull();
  });

  it('does not false-positive "folktronica" as "folk"', () => {
    expect(matchGenre(['folktronica'])).toBeNull();
  });

  it('matches new explicit aliases', () => {
    expect(matchGenre(['k-pop'])).toBe('pop');
    expect(matchGenre(['metalcore'])).toBe('metal');
    expect(matchGenre(['shoegaze'])).toBe('alternative');
    expect(matchGenre(['bluegrass'])).toBe('country');
    expect(matchGenre(['disco'])).toBe('funk');
    expect(matchGenre(['ska'])).toBe('reggae');
  });
});
