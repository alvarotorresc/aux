// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MiniRanking } from '../MiniRanking';
import type { Member, SongWithVotes, Vote, Song } from '../../../lib/types';

vi.mock('../../../i18n', () => ({
  t: (key: string, locale: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'group.ranking.title': 'Round ranking',
        'group.noSongsYet': 'No songs yet',
        'ranking.by': 'by',
      },
      es: {
        'group.ranking.title': 'Ranking de la ronda',
        'group.noSongsYet': 'Sin canciones aun',
        'ranking.by': 'por',
      },
    };
    return translations[locale]?.[key] ?? key;
  },
}));

// --- Factories ---

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    group_id: 'group-1',
    name: 'Alice',
    avatar: '\u{1F3B5}',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    round_id: 'round-1',
    member_id: 'member-1',
    title: 'Test Song',
    artist: 'Test Artist',
    album: null,
    thumbnail_url: null,
    platform_links: [],
    odesli_page_url: null,
    genre: null,
    created_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

function makeSongWithVotes(
  overrides: Partial<SongWithVotes> = {},
  votes: Vote[] = [],
): SongWithVotes {
  const avgRating =
    votes.length > 0 ? votes.reduce((sum, v) => sum + v.rating, 0) / votes.length : 0;
  return {
    ...makeSong(overrides),
    votes,
    avgRating: overrides.avgRating ?? avgRating,
    totalVotes: overrides.totalVotes ?? votes.length,
  };
}

describe('MiniRanking', () => {
  const members: Member[] = [
    makeMember({ id: 'member-1', name: 'Alice' }),
    makeMember({ id: 'member-2', name: 'Bob' }),
    makeMember({ id: 'member-3', name: 'Carol' }),
  ];

  it('should render empty state when no songs', () => {
    render(<MiniRanking songs={[]} members={members} roundNumber={1} locale="en" />);

    expect(screen.getByText('No songs yet')).toBeDefined();
  });

  it('should render the round ranking title', () => {
    render(<MiniRanking songs={[]} members={members} roundNumber={3} locale="en" />);

    expect(screen.getByText(/Round ranking/)).toBeDefined();
    expect(screen.getByText('3', { exact: false })).toBeDefined();
  });

  it('should render songs sorted by rating (highest first)', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({ id: 's1', title: 'Low Song', avgRating: 2.0, totalVotes: 1 }),
      makeSongWithVotes({ id: 's2', title: 'High Song', avgRating: 4.5, totalVotes: 1 }),
      makeSongWithVotes({ id: 's3', title: 'Mid Song', avgRating: 3.0, totalVotes: 1 }),
    ];

    const { container } = render(
      <MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />,
    );

    const titles = Array.from(container.querySelectorAll('p.truncate')).map((el) => el.textContent);
    expect(titles).toEqual(['High Song', 'Mid Song', 'Low Song']);
  });

  it('should show medals for top 3 when they have votes', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({ id: 's1', title: 'First', avgRating: 5.0, totalVotes: 3 }),
      makeSongWithVotes({ id: 's2', title: 'Second', avgRating: 4.0, totalVotes: 3 }),
      makeSongWithVotes({ id: 's3', title: 'Third', avgRating: 3.0, totalVotes: 3 }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.getByText('\u{1F947}')).toBeDefined(); // gold
    expect(screen.getByText('\u{1F948}')).toBeDefined(); // silver
    expect(screen.getByText('\u{1F949}')).toBeDefined(); // bronze
  });

  it('should not show medals when totalVotes is 0', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({ id: 's1', title: 'Unvoted', avgRating: 0, totalVotes: 0 }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.queryByText('\u{1F947}')).toBeNull();
    // Should show position number "1" instead
    expect(screen.getByText('1')).toBeDefined();
  });

  it('should display member name from members list', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({
        id: 's1',
        title: 'Great Track',
        member_id: 'member-2',
        avgRating: 4.0,
        totalVotes: 1,
      }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.getByText(/Bob/)).toBeDefined();
  });

  it('should display "?" when member is not found', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({
        id: 's1',
        title: 'Unknown Song',
        member_id: 'member-unknown',
        avgRating: 3.5,
        totalVotes: 1,
      }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.getByText(/\?/)).toBeDefined();
  });

  it('should display average rating formatted to one decimal', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({ id: 's1', title: 'Song', avgRating: 4.333, totalVotes: 3 }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.getByText('4.3')).toBeDefined();
  });

  it('should render thumbnail when valid https URL is provided', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({
        id: 's1',
        title: 'With Thumb',
        thumbnail_url: 'https://img.youtube.com/thumb.jpg',
        avgRating: 4.0,
        totalVotes: 1,
      }),
    ];

    const { container } = render(
      <MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />,
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://img.youtube.com/thumb.jpg');
  });

  it('should not render img for http thumbnail URL', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({
        id: 's1',
        title: 'Unsafe Thumb',
        thumbnail_url: 'http://insecure.com/thumb.jpg',
        avgRating: 4.0,
        totalVotes: 1,
      }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should not render img for invalid thumbnail URL', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({
        id: 's1',
        title: 'Bad URL',
        thumbnail_url: 'not-a-url',
        avgRating: 4.0,
        totalVotes: 1,
      }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should render placeholder SVG when thumbnail is null', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({
        id: 's1',
        title: 'No Thumb',
        thumbnail_url: null,
        avgRating: 4.0,
        totalVotes: 1,
      }),
    ];

    const { container } = render(
      <MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />,
    );

    const placeholderSvg = container.querySelector('svg[aria-hidden="true"]');
    expect(placeholderSvg).not.toBeNull();
  });

  it('should render with ES locale', () => {
    render(<MiniRanking songs={[]} members={members} roundNumber={2} locale="es" />);

    expect(screen.getByText(/Ranking de la ronda/)).toBeDefined();
    expect(screen.getByText('Sin canciones aun')).toBeDefined();
  });

  it('should show position numbers for songs beyond top 3', () => {
    const songs: SongWithVotes[] = [
      makeSongWithVotes({ id: 's1', title: 'First', avgRating: 5.0, totalVotes: 1 }),
      makeSongWithVotes({ id: 's2', title: 'Second', avgRating: 4.0, totalVotes: 1 }),
      makeSongWithVotes({ id: 's3', title: 'Third', avgRating: 3.0, totalVotes: 1 }),
      makeSongWithVotes({ id: 's4', title: 'Fourth', avgRating: 2.0, totalVotes: 1 }),
    ];

    render(<MiniRanking songs={songs} members={members} roundNumber={1} locale="en" />);

    expect(screen.getByText('4')).toBeDefined();
  });
});
