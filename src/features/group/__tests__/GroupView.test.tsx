// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GroupView } from '../GroupView';
import type { Group, Member, Round, SongWithVotes } from '../../../lib/types';

// --- Mocks at boundaries ---

const mockUseMember = vi.fn();
vi.mock('../../../hooks/useMember', () => ({
  useMember: (...args: unknown[]) => mockUseMember(...args),
}));

const mockUseGroup = vi.fn();
vi.mock('../useGroup', () => ({
  useGroup: (...args: unknown[]) => mockUseGroup(...args),
}));

vi.mock('../../join/JoinGroup', () => ({
  JoinGroup: (props: { slug: string; groupId: string; locale: string }) => (
    <div data-testid="join-group">JoinGroup:{props.slug}</div>
  ),
}));

vi.mock('../RoundInfo', () => ({
  RoundInfo: (props: { songCount: number; songsPerRound: number }) => (
    <div data-testid="round-info">
      RoundInfo:{props.songCount}/{props.songsPerRound}
    </div>
  ),
}));

vi.mock('../AddSong', () => ({
  AddSong: () => <div data-testid="add-song">AddSong</div>,
}));

vi.mock('../SongCard', () => ({
  SongCard: (props: { song: { id: string; title: string } }) => (
    <div data-testid={`song-card-${props.song.id}`}>{props.song.title}</div>
  ),
}));

vi.mock('../MiniRanking', () => ({
  MiniRanking: () => <div data-testid="mini-ranking">MiniRanking</div>,
}));

vi.mock('../../../components/ui/Button', () => ({
  Button: (
    props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode },
  ) => <button {...props}>{props.children}</button>,
}));

const mockSaveMyGroup = vi.fn();
vi.mock('../../../lib/storage', () => ({
  saveMyGroup: (...args: unknown[]) => mockSaveMyGroup(...args),
}));

// --- Factories ---

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 'group-1',
    name: 'Test Group',
    slug: 'abc123',
    songs_per_round: 3,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    group_id: 'group-1',
    name: 'Alice',
    avatar: '🎵',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-1',
    group_id: 'group-1',
    number: 1,
    starts_at: '2026-02-23T00:00:00.000Z',
    ends_at: '2026-03-01T23:59:59.999Z',
    created_at: '2026-02-23T00:00:00.000Z',
    ...overrides,
  };
}

function makeSong(overrides: Partial<SongWithVotes> = {}): SongWithVotes {
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
    created_at: '2026-01-01T00:00:00Z',
    votes: [],
    avgRating: 0,
    totalVotes: 0,
    ...overrides,
  };
}

// --- Setup ---

const defaultMembers = [makeMember(), makeMember({ id: 'member-2', name: 'Bob', avatar: '🎸' })];
const defaultGroup = makeGroup();

function setupUseGroupDefaults(overrides: Record<string, unknown> = {}) {
  mockUseGroup.mockReturnValue({
    round: makeRound(),
    songs: [],
    members: defaultMembers,
    isLoading: false,
    error: null,
    addSong: vi.fn(),
    voteSong: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  });
}

// Mock clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  share: vi.fn(),
});

describe('GroupView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- Loading state ---

  it('should show loading spinner when useMember is loading', () => {
    mockUseMember.mockReturnValue({ member: null, isLoading: true });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // --- Join flow ---

  it('should show JoinGroup when no member is found', () => {
    mockUseMember.mockReturnValue({ member: null, isLoading: false });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByTestId('join-group')).toHaveTextContent('JoinGroup:abc123');
  });

  // --- GroupContent rendering ---

  it('should show GroupContent when member exists', () => {
    const member = makeMember();
    mockUseMember.mockReturnValue({ member, isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('should call saveMyGroup on mount when member exists', () => {
    const member = makeMember();
    mockUseMember.mockReturnValue({ member, isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(mockSaveMyGroup).toHaveBeenCalledWith('abc123', 'Test Group');
  });

  // --- GroupNav ---

  it('should display group name in nav', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('should display member count in nav', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByText(/2 members/i)).toBeInTheDocument();
  });

  it('should display current member name and avatar in nav', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });

  // --- Share button ---

  it('should copy slug to clipboard when share button is clicked', async () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    const shareButton = screen.getByText('abc123').closest('button')!;
    await act(async () => {
      fireEvent.click(shareButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc123');
  });

  it('should show "Copied!" text after copying slug', async () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    const shareButton = screen.getByText('abc123').closest('button')!;
    await act(async () => {
      fireEvent.click(shareButton);
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should reset copied state after 2 seconds', async () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    const shareButton = screen.getByText('abc123').closest('button')!;
    await act(async () => {
      fireEvent.click(shareButton);
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('should fallback to navigator.share when clipboard fails', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('denied'),
    );
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    const shareButton = screen.getByText('abc123').closest('button')!;
    await act(async () => {
      fireEvent.click(shareButton);
    });

    expect(navigator.share).toHaveBeenCalledWith({ title: 'Aux', text: 'abc123' });
  });

  // --- Tab switching ---

  it('should show songs tab by default', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({
      songs: [makeSong()],
    });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    const songsTab = screen.getByRole('tab', { name: 'Songs' });
    expect(songsTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should switch to ranking tab when clicked', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Ranking' }));

    const rankingTab = screen.getByRole('tab', { name: 'Ranking' });
    expect(rankingTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('mini-ranking')).toBeInTheDocument();
  });

  it('should show songs when switching back to songs tab', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({
      songs: [makeSong()],
    });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    // Switch to ranking, then back
    fireEvent.click(screen.getByRole('tab', { name: 'Ranking' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Songs' }));

    expect(screen.getByTestId('song-card-song-1')).toBeInTheDocument();
  });

  // --- Songs tab content ---

  it('should render song cards for each song', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({
      songs: [
        makeSong({ id: 's1', title: 'Song A' }),
        makeSong({ id: 's2', title: 'Song B', member_id: 'member-2' }),
      ],
    });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByTestId('song-card-s1')).toBeInTheDocument();
    expect(screen.getByTestId('song-card-s2')).toBeInTheDocument();
  });

  it('should show AddSong when member has not reached song limit', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({
      songs: [makeSong({ member_id: 'member-1' })],
    });

    render(
      <GroupView group={makeGroup({ songs_per_round: 3 })} members={defaultMembers} locale="en" />,
    );

    expect(screen.getByTestId('add-song')).toBeInTheDocument();
  });

  it('should hide AddSong when member has reached song limit', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({
      songs: [
        makeSong({ id: 's1', member_id: 'member-1' }),
        makeSong({ id: 's2', member_id: 'member-1' }),
        makeSong({ id: 's3', member_id: 'member-1' }),
      ],
    });

    render(
      <GroupView group={makeGroup({ songs_per_round: 3 })} members={defaultMembers} locale="en" />,
    );

    expect(screen.queryByTestId('add-song')).not.toBeInTheDocument();
  });

  it('should show empty state when no songs exist', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({ songs: [] });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    // Both texts are rendered inside the same <p> element
    expect(screen.getByText(/No songs yet/)).toBeInTheDocument();
    expect(screen.getByText(/Be the first to add one!/)).toBeInTheDocument();
  });

  // --- Ranking tab ---

  it('should show full leaderboard link in ranking tab', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Ranking' }));

    const link = screen.getByText('Full leaderboard');
    expect(link.closest('a')).toHaveAttribute('href', '/g/abc123/leaderboard');
  });

  it('should use /es prefix for leaderboard link in Spanish locale', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults();

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="es" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Ranking' }));

    const link = screen.getByText('Clasificacion completa');
    expect(link.closest('a')).toHaveAttribute('href', '/es/g/abc123/leaderboard');
  });

  // --- Error state ---

  it('should show error message when useGroup has an error', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({ error: 'Connection failed', round: null });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show fallback error message when round is null and no error', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({ error: null, round: null });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    expect(screen.getByText('Failed to load round')).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked', () => {
    const mockRefetch = vi.fn();
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({ error: 'Connection failed', round: null, refetch: mockRefetch });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    fireEvent.click(screen.getByText('Retry'));

    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  // --- Loading state inside GroupContent ---

  it('should show loading spinner when useGroup is loading', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({ isLoading: true });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    // Nav should still be visible during loading
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  // --- RoundInfo ---

  it('should pass correct song count to RoundInfo', () => {
    mockUseMember.mockReturnValue({ member: makeMember(), isLoading: false });
    setupUseGroupDefaults({
      songs: [
        makeSong({ id: 's1', member_id: 'member-1' }),
        makeSong({ id: 's2', member_id: 'member-2' }),
      ],
    });

    render(<GroupView group={defaultGroup} members={defaultMembers} locale="en" />);

    // member-1 has 1 song, songs_per_round is 3
    expect(screen.getByTestId('round-info')).toHaveTextContent('RoundInfo:1/3');
  });
});
