// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoundInfo } from '../RoundInfo';
import type { Round } from '../../../lib/types';

// Mock i18n with actual key->value mapping
vi.mock('../../../i18n', () => ({
  t: (key: string, locale: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'group.round': 'Round',
        'group.songs_count': 'songs',
      },
      es: {
        'group.round': 'Ronda',
        'group.songs_count': 'canciones',
      },
    };
    return translations[locale]?.[key] ?? key;
  },
}));

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-1',
    group_id: 'group-1',
    number: 3,
    starts_at: '2026-02-23T00:00:00.000Z',
    ends_at: '2026-03-01T23:59:59.999Z',
    created_at: '2026-02-23T00:00:01.000Z',
    ...overrides,
  };
}

describe('RoundInfo', () => {
  it('should render the round number', () => {
    render(<RoundInfo round={makeRound()} songCount={2} songsPerRound={5} locale="en" />);

    // "Round 3" is rendered inside a single span
    expect(screen.getByText(/Round\s+3/)).toBeDefined();
  });

  it('should render the song count badge', () => {
    render(<RoundInfo round={makeRound()} songCount={2} songsPerRound={5} locale="en" />);

    expect(screen.getByText('2/5 songs')).toBeDefined();
  });

  it('should render date range', () => {
    render(<RoundInfo round={makeRound()} songCount={0} songsPerRound={3} locale="en" />);

    // The dates are formatted via Intl.DateTimeFormat
    // Feb 23 and Mar 1 for en-US locale
    const container = screen.getByText(/Feb/);
    expect(container).toBeDefined();
  });

  it('should render with ES locale translations', () => {
    render(<RoundInfo round={makeRound()} songCount={1} songsPerRound={4} locale="es" />);

    expect(screen.getByText(/Ronda/)).toBeDefined();
    expect(screen.getByText('1/4 canciones')).toBeDefined();
  });

  it('should render date range with ES locale formatting', () => {
    render(<RoundInfo round={makeRound()} songCount={0} songsPerRound={3} locale="es" />);

    // es-ES format uses lowercase month: "23 feb"
    const container = screen.getByText(/feb/i);
    expect(container).toBeDefined();
  });

  it('should show 0 song count correctly', () => {
    render(<RoundInfo round={makeRound()} songCount={0} songsPerRound={5} locale="en" />);

    expect(screen.getByText('0/5 songs')).toBeDefined();
  });

  it('should show full song count when at capacity', () => {
    render(<RoundInfo round={makeRound()} songCount={5} songsPerRound={5} locale="en" />);

    expect(screen.getByText('5/5 songs')).toBeDefined();
  });
});
