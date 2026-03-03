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
});
