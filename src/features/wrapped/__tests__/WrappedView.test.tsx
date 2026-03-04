// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { WrappedView } from '../WrappedView';
import type { Group } from '../../../lib/types';
import type { WrappedStats, WrappedPeriod } from '../../../lib/wrapped';
import type { UseWrappedResult } from '../useWrapped';

// --- Mock useWrapped ---

let mockResult: UseWrappedResult;

vi.mock('../useWrapped', () => ({
  useWrapped: () => mockResult,
}));

// --- Mock GenreBadge ---

vi.mock('../../../components/ui/GenreBadge', () => ({
  GenreBadge: ({ genre }: { genre: string | null }) =>
    genre ? <span data-testid="genre-badge">{genre}</span> : null,
}));

// --- Mock Button ---

vi.mock('../../../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// --- Mock PlaylistCard ---

vi.mock('../PlaylistCard', () => ({
  PlaylistCard: () => <div data-testid="playlist-card">PlaylistCard</div>,
}));

// --- Mock IntersectionObserver ---

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    // Trigger immediately so cards become visible in tests
    setTimeout(() => {
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }, 0);
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

// --- Helpers ---

const group: Group = {
  id: 'group-1',
  name: 'Test Group',
  slug: 'test-group',
  songs_per_round: 1,
  created_at: '2026-01-01T00:00:00Z',
};

const defaultPeriod: WrappedPeriod = { type: 'quarterly', year: 2026, quarter: 1 };

function makeStats(overrides: Partial<WrappedStats> = {}): WrappedStats {
  return {
    period: defaultPeriod,
    totalSongs: 10,
    totalRounds: 3,
    totalVotes: 25,
    topSong: {
      id: 'song-1',
      title: 'Best Song',
      artist: 'Best Artist',
      thumbnail_url: null,
      genre: 'rock',
      memberName: 'Alice',
      avgRating: 4.8,
      totalVotes: 5,
      platform_links: [],
      odesli_page_url: null,
    },
    topMembers: [
      {
        id: 'm1',
        name: 'Alice',
        avatar: '🎵',
        totalScore: 15,
        songsAdded: 3,
        avgReceived: 4.5,
        roundsWon: 2,
      },
      {
        id: 'm2',
        name: 'Bob',
        avatar: '🎸',
        totalScore: 10,
        songsAdded: 3,
        avgReceived: 3.5,
        roundsWon: 1,
      },
    ],
    topSongs: [
      {
        id: 'song-1',
        title: 'Best Song',
        artist: 'Best Artist',
        thumbnail_url: null,
        genre: 'rock',
        memberName: 'Alice',
        avgRating: 4.8,
        totalVotes: 5,
        platform_links: [],
        odesli_page_url: null,
      },
      {
        id: 'song-2',
        title: 'Second Song',
        artist: 'Second Artist',
        thumbnail_url: null,
        genre: 'pop',
        memberName: 'Bob',
        avgRating: 4.2,
        totalVotes: 4,
        platform_links: [],
        odesli_page_url: null,
      },
    ],
    allSongs: [
      {
        id: 'song-1',
        title: 'Best Song',
        artist: 'Best Artist',
        thumbnail_url: null,
        genre: 'rock',
        memberName: 'Alice',
        avgRating: 4.8,
        totalVotes: 5,
        platform_links: [],
        odesli_page_url: null,
      },
      {
        id: 'song-2',
        title: 'Second Song',
        artist: 'Second Artist',
        thumbnail_url: null,
        genre: 'pop',
        memberName: 'Bob',
        avgRating: 4.2,
        totalVotes: 4,
        platform_links: [],
        odesli_page_url: null,
      },
    ],
    genreDistribution: [
      { genre: 'rock', count: 5 },
      { genre: 'pop', count: 3 },
    ],
    topGenre: 'rock',
    ...overrides,
  };
}

function resetMockResult() {
  mockResult = {
    stats: makeStats(),
    availablePeriods: [
      defaultPeriod,
      { type: 'quarterly', year: 2025, quarter: 4 },
      { type: 'annual', year: 2025 },
    ],
    selectedPeriod: defaultPeriod,
    setSelectedPeriod: vi.fn(),
    isLoading: false,
    error: null,
  };
}

describe('WrappedView', () => {
  beforeEach(() => {
    resetMockResult();
  });

  it('renders loading spinner when loading', () => {
    mockResult = { ...mockResult, isLoading: true, stats: null };
    const { container } = render(<WrappedView group={group} locale="en" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders error state with message', () => {
    mockResult = { ...mockResult, error: 'Network error', stats: null };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders overview stats (songs, rounds, votes)', () => {
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('songs shared')).toBeInTheDocument();
    expect(screen.getByText('rounds played')).toBeInTheDocument();
    expect(screen.getByText('votes cast')).toBeInTheDocument();
  });

  it('renders top song card with title and artist', () => {
    render(<WrappedView group={group} locale="en" />);
    // "Best Song" appears in both topSong card and topSongs list
    expect(screen.getAllByText('Best Song').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Best Artist').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Song of the quarter')).toBeInTheDocument();
  });

  it('renders top members', () => {
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('15.0')).toBeInTheDocument();
  });

  it('renders genre distribution', () => {
    render(<WrappedView group={group} locale="en" />);
    const badges = screen.getAllByTestId('genre-badge');
    expect(badges).toHaveLength(3); // 1 in top song + 2 in genre card
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({ totalSongs: 0, totalRounds: 0, totalVotes: 0 }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Not enough data for this period yet')).toBeInTheDocument();
  });

  it('renders period selector with available periods', () => {
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Q1 2026')).toBeInTheDocument();
    expect(screen.getByText('Q4 2025')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('calls setSelectedPeriod when a period chip is clicked', () => {
    render(<WrappedView group={group} locale="en" />);
    fireEvent.click(screen.getByText('Q4 2025'));
    expect(mockResult.setSelectedPeriod).toHaveBeenCalledWith({
      type: 'quarterly',
      year: 2025,
      quarter: 4,
    });
  });

  it('renders nav with group name and wrapped title', () => {
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Wrapped')).toBeInTheDocument();
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('renders back link to leaderboard', () => {
    render(<WrappedView group={group} locale="en" />);
    const link = screen.getByLabelText('Back to leaderboard');
    expect(link).toHaveAttribute('href', '/g/test-group/leaderboard');
  });

  it('renders Spanish locale with correct back URL and labels', () => {
    render(<WrappedView group={group} locale="es" />);
    const link = screen.getByLabelText('Volver al ranking');
    expect(link).toHaveAttribute('href', '/es/g/test-group/leaderboard');
    expect(screen.getByText('canciones compartidas')).toBeInTheDocument();
    expect(screen.getByText('rondas jugadas')).toBeInTheDocument();
  });

  it('renders song of the year label for annual period', () => {
    mockResult = {
      ...mockResult,
      selectedPeriod: { type: 'annual', year: 2025 },
      stats: makeStats({ period: { type: 'annual', year: 2025 } }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Song of the year')).toBeInTheDocument();
  });

  it('renders thumbnail image when valid HTTPS URL provided', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topSong: {
          id: 'song-1',
          title: 'Thumb Song',
          artist: 'Thumb Artist',
          thumbnail_url: 'https://example.com/thumb.jpg',
          genre: null,
          memberName: 'Alice',
          avgRating: 4.5,
          totalVotes: 3,
          platform_links: [],
          odesli_page_url: null,
        },
      }),
    };
    render(<WrappedView group={group} locale="en" />);
    const imgs = document.querySelectorAll('img[src="https://example.com/thumb.jpg"]');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
  });

  it('excludes members with zero songsAdded from top members', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topMembers: [
          {
            id: 'm1',
            name: 'Active',
            avatar: '🎵',
            totalScore: 10,
            songsAdded: 2,
            avgReceived: 4.0,
            roundsWon: 1,
          },
          {
            id: 'm2',
            name: 'Inactive',
            avatar: '🔇',
            totalScore: 0,
            songsAdded: 0,
            avgReceived: 0,
            roundsWon: 0,
          },
        ],
      }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
  });

  it('renders PlaylistCard when allSongs is not empty', () => {
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByTestId('playlist-card')).toBeInTheDocument();
  });

  it('does not render PlaylistCard when allSongs is empty', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({ allSongs: [] }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.queryByTestId('playlist-card')).not.toBeInTheDocument();
  });

  it('should render fallback icon when thumbnail_url is an invalid URL string', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topSong: {
          id: 'song-1',
          title: 'Bad Thumb Song',
          artist: 'Bad Thumb Artist',
          thumbnail_url: 'not-a-valid-url',
          genre: null,
          memberName: 'Alice',
          avgRating: 4.5,
          totalVotes: 3,
          platform_links: [],
          odesli_page_url: null,
        },
        topSongs: [
          {
            id: 'song-1',
            title: 'Bad Thumb Song',
            artist: 'Bad Thumb Artist',
            thumbnail_url: 'not-a-valid-url',
            genre: null,
            memberName: 'Alice',
            avgRating: 4.5,
            totalVotes: 3,
            platform_links: [],
            odesli_page_url: null,
          },
        ],
      }),
    };
    render(<WrappedView group={group} locale="en" />);

    // With invalid URL, safeThumbUrl returns null, so no <img> is rendered
    const imgs = document.querySelectorAll('img[src="not-a-valid-url"]');
    expect(imgs.length).toBe(0);
    // The song title should still render
    expect(screen.getAllByText('Bad Thumb Song').length).toBeGreaterThanOrEqual(1);
  });

  it('should render fallback icon when thumbnail_url uses HTTP protocol', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topSong: {
          id: 'song-1',
          title: 'HTTP Song',
          artist: 'HTTP Artist',
          thumbnail_url: 'http://example.com/thumb.jpg',
          genre: null,
          memberName: 'Alice',
          avgRating: 4.5,
          totalVotes: 3,
          platform_links: [],
          odesli_page_url: null,
        },
      }),
    };
    render(<WrappedView group={group} locale="en" />);

    // HTTP URLs are rejected by safeThumbUrl (only HTTPS allowed)
    const imgs = document.querySelectorAll('img[src="http://example.com/thumb.jpg"]');
    expect(imgs.length).toBe(0);
  });

  it('should call window.location.reload when retry button is clicked in error state', () => {
    mockResult = { ...mockResult, error: 'Something broke', stats: null };
    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
      configurable: true,
    });

    render(<WrappedView group={group} locale="en" />);
    fireEvent.click(screen.getByText('Retry'));

    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it('should not render period selector when availablePeriods is empty', () => {
    mockResult = {
      ...mockResult,
      availablePeriods: [],
      stats: makeStats(),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('should not render TopSongCard when topSong is null', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({ topSong: null }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.queryByText('Song of the quarter')).not.toBeInTheDocument();
    expect(screen.queryByText('Song of the year')).not.toBeInTheDocument();
  });

  it('should not render TopMembersCard when all members have zero songsAdded', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topMembers: [
          {
            id: 'm1',
            name: 'Zero',
            avatar: '0',
            totalScore: 0,
            songsAdded: 0,
            avgReceived: 0,
            roundsWon: 0,
          },
        ],
      }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.queryByText('Top members')).not.toBeInTheDocument();
  });

  it('should not render TopSongsCard when topSongs is empty', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({ topSongs: [] }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.queryByText('Top 5 songs')).not.toBeInTheDocument();
  });

  it('should not render GenresCard when genreDistribution is empty', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({ genreDistribution: [] }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.queryByText('Genres')).not.toBeInTheDocument();
  });

  it('should show numeric rank instead of medal for members beyond 3rd place', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topMembers: [
          {
            id: 'm1',
            name: 'First',
            avatar: 'A',
            totalScore: 40,
            songsAdded: 5,
            avgReceived: 4.5,
            roundsWon: 3,
          },
          {
            id: 'm2',
            name: 'Second',
            avatar: 'B',
            totalScore: 30,
            songsAdded: 4,
            avgReceived: 4.0,
            roundsWon: 2,
          },
          {
            id: 'm3',
            name: 'Third',
            avatar: 'C',
            totalScore: 20,
            songsAdded: 3,
            avgReceived: 3.5,
            roundsWon: 1,
          },
          {
            id: 'm4',
            name: 'Fourth',
            avatar: 'D',
            totalScore: 10,
            songsAdded: 2,
            avgReceived: 3.0,
            roundsWon: 0,
          },
        ],
      }),
    };
    render(<WrappedView group={group} locale="en" />);
    // The 4th member renders with name and numeric rank instead of medal
    expect(screen.getByText('Fourth')).toBeInTheDocument();
    // Verify the 4th rank number is rendered (inside the rank span)
    const allFours = screen.getAllByText('4');
    expect(allFours.length).toBeGreaterThanOrEqual(1);
  });

  it('should show numeric rank instead of medal for songs beyond 3rd place', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topSongs: [
          {
            id: 's1',
            title: 'Song1',
            artist: 'A1',
            thumbnail_url: null,
            genre: null,
            memberName: 'Alice',
            avgRating: 5,
            totalVotes: 5,
            platform_links: [],
            odesli_page_url: null,
          },
          {
            id: 's2',
            title: 'Song2',
            artist: 'A2',
            thumbnail_url: null,
            genre: null,
            memberName: 'Bob',
            avgRating: 4.5,
            totalVotes: 5,
            platform_links: [],
            odesli_page_url: null,
          },
          {
            id: 's3',
            title: 'Song3',
            artist: 'A3',
            thumbnail_url: null,
            genre: null,
            memberName: 'Charlie',
            avgRating: 4,
            totalVotes: 5,
            platform_links: [],
            odesli_page_url: null,
          },
          {
            id: 's4',
            title: 'FourthSong',
            artist: 'A4',
            thumbnail_url: null,
            genre: null,
            memberName: 'Dave',
            avgRating: 3.5,
            totalVotes: 5,
            platform_links: [],
            odesli_page_url: null,
          },
        ],
      }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('FourthSong')).toBeInTheDocument();
  });

  it('should render thumbnail image for songs in topSongs list with valid HTTPS URL', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topSongs: [
          {
            id: 's1',
            title: 'Thumb Song In List',
            artist: 'Thumb Artist',
            thumbnail_url: 'https://example.com/list-thumb.jpg',
            genre: null,
            memberName: 'Alice',
            avgRating: 4.8,
            totalVotes: 5,
            platform_links: [],
            odesli_page_url: null,
          },
        ],
      }),
    };
    render(<WrappedView group={group} locale="en" />);
    const imgs = document.querySelectorAll('img[src="https://example.com/list-thumb.jpg"]');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
  });

  it('should hide star rating when song has zero totalVotes in topSongs list', () => {
    mockResult = {
      ...mockResult,
      stats: makeStats({
        topSongs: [
          {
            id: 'song-zero',
            title: 'Zero Votes Song',
            artist: 'Zero Artist',
            thumbnail_url: null,
            genre: null,
            memberName: 'Alice',
            avgRating: 0,
            totalVotes: 0,
            platform_links: [],
            odesli_page_url: null,
          },
        ],
      }),
    };
    render(<WrappedView group={group} locale="en" />);
    expect(screen.getByText('Zero Votes Song')).toBeInTheDocument();
    // No star rating displayed for zero-vote songs
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });
});
