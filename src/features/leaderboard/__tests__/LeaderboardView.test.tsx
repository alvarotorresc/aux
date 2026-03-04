// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { LeaderboardView } from '../LeaderboardView';
import type { Group, MemberStats } from '../../../lib/types';
import type { PastRound, PastRoundSong, AllTimeSong } from '../useLeaderboard';

// --- Mocks ---

interface UseLeaderboardReturn {
  members: MemberStats[];
  pastRounds: PastRound[];
  topSongs: AllTimeSong[];
  currentRoundNumber: number | null;
  currentRoundSongs: PastRoundSong[];
  isLoading: boolean;
  error: string | null;
}

let mockLeaderboard: UseLeaderboardReturn;

vi.mock('../useLeaderboard', () => ({
  useLeaderboard: () => mockLeaderboard,
}));

vi.mock('../Podium', () => ({
  Podium: ({ members }: { members: MemberStats[] }) => (
    <div data-testid="podium">Podium ({members.length} members)</div>
  ),
}));

vi.mock('../PastRounds', () => ({
  PastRounds: ({ rounds }: { rounds: PastRound[] }) => (
    <div data-testid="past-rounds">PastRounds ({rounds.length} rounds)</div>
  ),
}));

vi.mock('../TopSongs', () => ({
  TopSongs: ({ songs }: { songs: AllTimeSong[] }) => (
    <div data-testid="top-songs">TopSongs ({songs.length} songs)</div>
  ),
}));

vi.mock('../../../components/ui/GenreFilter', () => ({
  GenreFilter: ({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (v: string | null) => void;
  }) => (
    <select
      data-testid="genre-filter"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">All</option>
      <option value="rock">Rock</option>
    </select>
  ),
}));

vi.mock('../../../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// --- Helpers ---

const group: Group = {
  id: 'group-1',
  name: 'Test Group',
  slug: 'test-group',
  songs_per_round: 1,
  created_at: '2026-01-01T00:00:00Z',
};

function makeMember(overrides: Partial<MemberStats> = {}): MemberStats {
  return {
    id: 'm1',
    group_id: 'g1',
    name: 'Alice',
    avatar: '🎵',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    totalScore: 42.5,
    songsAdded: 5,
    avgReceived: 4.2,
    roundsWon: 3,
    ...overrides,
  };
}

function makeSong(overrides: Partial<PastRoundSong> = {}): PastRoundSong {
  return {
    id: 's1',
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail_url: null,
    memberName: 'Alice',
    avgRating: 4.5,
    totalVotes: 3,
    ...overrides,
  };
}

function makeAllTimeSong(overrides: Partial<AllTimeSong> = {}): AllTimeSong {
  return {
    id: 's1',
    title: 'All Time Song',
    artist: 'All Time Artist',
    thumbnail_url: null,
    memberName: 'Alice',
    avgRating: 4.8,
    totalVotes: 5,
    roundNumber: 1,
    ...overrides,
  };
}

function makeRound(overrides: Partial<PastRound> = {}): PastRound {
  return {
    number: 1,
    winner: 'Alice',
    topSong: 'Best Song',
    topArtist: 'Best Artist',
    topGenre: 'rock',
    topScore: 4.5,
    songs: [],
    ...overrides,
  };
}

function defaultLeaderboard(): UseLeaderboardReturn {
  return {
    members: [makeMember()],
    pastRounds: [makeRound()],
    topSongs: [makeAllTimeSong()],
    currentRoundNumber: 5,
    currentRoundSongs: [makeSong()],
    isLoading: false,
    error: null,
  };
}

describe('LeaderboardView', () => {
  beforeEach(() => {
    mockLeaderboard = defaultLeaderboard();
  });

  // --- Loading state ---

  it('should render loading spinner when isLoading is true', () => {
    mockLeaderboard = { ...defaultLeaderboard(), isLoading: true };
    const { container } = render(<LeaderboardView group={group} locale="en" />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should not render tabs when loading', () => {
    mockLeaderboard = { ...defaultLeaderboard(), isLoading: true };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  // --- Error state ---

  it('should render error message when error is present', () => {
    mockLeaderboard = { ...defaultLeaderboard(), error: 'Something broke' };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('should render retry button when error is present', () => {
    mockLeaderboard = { ...defaultLeaderboard(), error: 'Oops' };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should not render tabs when error is present', () => {
    mockLeaderboard = { ...defaultLeaderboard(), error: 'Oops' };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  // --- Navigation ---

  it('should render nav with leaderboard title and group name', () => {
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('should render back link pointing to group page', () => {
    render(<LeaderboardView group={group} locale="en" />);

    const backLink = screen.getByLabelText('Back to group');
    expect(backLink).toHaveAttribute('href', '/g/test-group');
  });

  it('should render wrapped link pointing to wrapped page', () => {
    render(<LeaderboardView group={group} locale="en" />);

    const wrappedLink = screen.getByText('Wrapped');
    expect(wrappedLink).toHaveAttribute('href', '/g/test-group/wrapped');
  });

  it('should use Spanish locale paths when locale is es', () => {
    render(<LeaderboardView group={group} locale="es" />);

    const backLink = screen.getByLabelText('Back to group');
    expect(backLink).toHaveAttribute('href', '/es/g/test-group');

    const wrappedLink = screen.getByText('Wrapped');
    expect(wrappedLink).toHaveAttribute('href', '/es/g/test-group/wrapped');
  });

  // --- Tabs ---

  it('should render tab switcher with two tabs', () => {
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByRole('tab', { name: 'This round' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All-time' })).toBeInTheDocument();
  });

  it('should have current tab selected by default', () => {
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByRole('tab', { name: 'This round' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'All-time' })).toHaveAttribute('aria-selected', 'false');
  });

  it('should switch to alltime tab when clicked', () => {
    render(<LeaderboardView group={group} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'All-time' }));

    expect(screen.getByRole('tab', { name: 'All-time' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'This round' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  // --- Current round tab content ---

  it('should render current round ranking with songs on current tab', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [
        makeSong({
          id: 's1',
          title: 'Current Song',
          memberName: 'Alice',
          avgRating: 4.2,
          totalVotes: 3,
        }),
      ],
      currentRoundNumber: 5,
    };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('Current Song')).toBeInTheDocument();
    expect(screen.getByText(/by Alice/)).toBeInTheDocument();
    expect(screen.getByText('Round ranking 5')).toBeInTheDocument();
  });

  it('should show empty message when no songs in current round', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [],
      currentRoundNumber: 5,
    };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('No songs added this round yet')).toBeInTheDocument();
  });

  it('should not render round title when currentRoundNumber is null', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [],
      currentRoundNumber: null,
    };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.queryByText(/Round ranking/)).not.toBeInTheDocument();
  });

  it('should show medal for first song with votes in current round', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [
        makeSong({ id: 's1', title: 'Top Song', totalVotes: 3, avgRating: 4.5 }),
        makeSong({ id: 's2', title: 'Second Song', totalVotes: 2, avgRating: 3.5 }),
      ],
    };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
  });

  it('should show numeric position for songs with zero votes', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [
        makeSong({ id: 's1', title: 'No Votes Song', totalVotes: 0, avgRating: 0 }),
      ],
    };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show rating with star for songs with votes in current round', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [
        makeSong({ id: 's1', title: 'Rated Song', totalVotes: 3, avgRating: 4.2 }),
      ],
    };
    render(<LeaderboardView group={group} locale="en" />);

    expect(screen.getByText('4.2')).toBeInTheDocument();
  });

  it('should render HTTPS thumbnail in current round songs', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [
        makeSong({ thumbnail_url: 'https://example.com/thumb.jpg', totalVotes: 1 }),
      ],
    };
    const { container } = render(<LeaderboardView group={group} locale="en" />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('should not render HTTP thumbnail in current round songs', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [
        makeSong({ thumbnail_url: 'http://insecure.com/thumb.jpg', totalVotes: 1 }),
      ],
    };
    const { container } = render(<LeaderboardView group={group} locale="en" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should not render malformed thumbnail URL in current round songs', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [makeSong({ thumbnail_url: 'not-a-valid-url', totalVotes: 1 })],
    };
    const { container } = render(<LeaderboardView group={group} locale="en" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  // --- All-time tab content ---

  it('should render podium, rankings, top songs, and past rounds on alltime tab', () => {
    render(<LeaderboardView group={group} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'All-time' }));

    expect(screen.getByTestId('podium')).toBeInTheDocument();
    expect(screen.getByTestId('top-songs')).toBeInTheDocument();
    expect(screen.getByTestId('past-rounds')).toBeInTheDocument();
    expect(screen.getByText('All-time standings')).toBeInTheDocument();
  });

  it('should not show current round content on alltime tab', () => {
    mockLeaderboard = {
      ...defaultLeaderboard(),
      currentRoundSongs: [makeSong({ title: 'Current Only' })],
    };
    render(<LeaderboardView group={group} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'All-time' }));

    expect(screen.queryByText('Current Only')).not.toBeInTheDocument();
  });

  it('should render genre filter on alltime tab', () => {
    render(<LeaderboardView group={group} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'All-time' }));

    expect(screen.getByTestId('genre-filter')).toBeInTheDocument();
  });

  // --- Rankings table ---

  it('should render member stats in rankings table on alltime tab', () => {
    const members = [
      makeMember({
        id: 'm1',
        name: 'Alice',
        totalScore: 42.5,
        songsAdded: 5,
        avgReceived: 4.2,
        roundsWon: 3,
      }),
      makeMember({
        id: 'm2',
        name: 'Bob',
        totalScore: 30.0,
        songsAdded: 4,
        avgReceived: 3.8,
        roundsWon: 1,
      }),
    ];
    mockLeaderboard = { ...defaultLeaderboard(), members };
    render(<LeaderboardView group={group} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'All-time' }));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('42.5')).toBeInTheDocument();
    expect(screen.getByText('30.0')).toBeInTheDocument();
  });

  // --- Genre filter ---

  it('should filter past rounds by genre when genre filter is used', () => {
    const rounds = [
      makeRound({ number: 1, topGenre: 'rock' }),
      makeRound({ number: 2, topGenre: 'jazz' }),
    ];
    mockLeaderboard = { ...defaultLeaderboard(), pastRounds: rounds };
    render(<LeaderboardView group={group} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'All-time' }));
    fireEvent.change(screen.getByTestId('genre-filter'), { target: { value: 'rock' } });

    // PastRounds mock shows count — should be filtered to 1
    expect(screen.getByText('PastRounds (1 rounds)')).toBeInTheDocument();
  });

  // --- Spanish locale ---

  it('should render Spanish labels when locale is es', () => {
    render(<LeaderboardView group={group} locale="es" />);

    expect(screen.getByRole('tab', { name: 'Esta ronda' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Historico' })).toBeInTheDocument();
  });
});
