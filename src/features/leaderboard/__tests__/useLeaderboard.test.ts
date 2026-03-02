// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLeaderboard } from '../useLeaderboard';
import type { Member, Round, Song, Vote } from '../../../lib/types';

// --- Configurable supabase mock ---

let mockData: {
  members: { data: Member[] | null; error: unknown };
  rounds: { data: Round[] | null; error: unknown };
  songs: { data: Song[] | null; error: unknown };
  votes: { data: Vote[] | null; error: unknown };
};

function resetMockData() {
  mockData = {
    members: { data: [], error: null },
    rounds: { data: [], error: null },
    songs: { data: [], error: null },
    votes: { data: [], error: null },
  };
}

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const tableData = () => {
        switch (table) {
          case 'members':
            return mockData.members;
          case 'rounds':
            return mockData.rounds;
          case 'songs':
            return mockData.songs;
          case 'votes':
            return mockData.votes;
          default:
            return { data: [], error: null };
        }
      };

      const chain: Record<string, unknown> = {};
      const resolve = () => Promise.resolve(tableData());

      // Build a chainable mock that always resolves with the table's data
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.in = () => resolve();
      chain.order = () => resolve();
      chain.then = (fn: (v: unknown) => void) => resolve().then(fn);

      return chain;
    },
  },
}));

// --- Factories ---

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
    starts_at: '2026-01-01T00:00:00Z',
    ends_at: '2026-01-07T23:59:59Z',
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
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: 'vote-1',
    song_id: 'song-1',
    member_id: 'member-2',
    rating: 4,
    created_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('useLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockData();
  });

  it('should start in loading state', () => {
    const { result } = renderHook(() => useLeaderboard('group-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.members).toEqual([]);
    expect(result.current.pastRounds).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return members with zero stats when no rounds exist', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [], error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].totalScore).toBe(0);
    expect(result.current.members[0].songsAdded).toBe(0);
    expect(result.current.members[0].avgReceived).toBe(0);
    expect(result.current.members[0].roundsWon).toBe(0);
  });

  it('should calculate totalScore as sum of all ratings received (completed rounds only)', async () => {
    const alice = makeMember({ id: 'alice' });
    // round-2 is most recent → current; round-1 is past
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const song = makeSong({ id: 'song-a', member_id: 'alice', round_id: 'round-1' });
    const votes = [
      makeVote({ id: 'v1', song_id: 'song-a', member_id: 'bob', rating: 4 }),
      makeVote({ id: 'v2', song_id: 'song-a', member_id: 'carol', rating: 3 }),
    ];

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members[0].totalScore).toBe(7); // 4 + 3
  });

  it('should calculate avgReceived as mean of all ratings (completed rounds only)', async () => {
    const alice = makeMember({ id: 'alice' });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const song = makeSong({ id: 'song-a', member_id: 'alice', round_id: 'round-1' });
    const votes = [
      makeVote({ id: 'v1', song_id: 'song-a', member_id: 'bob', rating: 4 }),
      makeVote({ id: 'v2', song_id: 'song-a', member_id: 'carol', rating: 2 }),
    ];

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members[0].avgReceived).toBe(3); // (4 + 2) / 2
  });

  it('should count songsAdded per member (completed rounds only)', async () => {
    const alice = makeMember({ id: 'alice' });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const songs = [
      makeSong({ id: 'song-1', member_id: 'alice', round_id: 'round-1' }),
      makeSong({ id: 'song-2', member_id: 'alice', round_id: 'round-1' }),
    ];

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: songs, error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members[0].songsAdded).toBe(2);
  });

  it('should sort members by totalScore descending (completed rounds only)', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const bob = makeMember({ id: 'bob', name: 'Bob' });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const songs = [
      makeSong({ id: 'song-a', member_id: 'alice', round_id: 'round-1' }),
      makeSong({ id: 'song-b', member_id: 'bob', round_id: 'round-1' }),
    ];
    const votes = [
      makeVote({ id: 'v1', song_id: 'song-a', member_id: 'bob', rating: 2 }),
      makeVote({ id: 'v2', song_id: 'song-b', member_id: 'alice', rating: 5 }),
    ];

    mockData.members = { data: [alice, bob], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: songs, error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members[0].id).toBe('bob'); // score 5
    expect(result.current.members[1].id).toBe('alice'); // score 2
  });

  it('should not count current round toward roundsWon', async () => {
    const alice = makeMember({ id: 'alice' });
    const currentRound = makeRound({ id: 'round-1', number: 1 });
    const song = makeSong({ id: 'song-a', member_id: 'alice', round_id: 'round-1' });
    const votes = [makeVote({ id: 'v1', song_id: 'song-a', member_id: 'bob', rating: 5 })];

    mockData.members = { data: [alice], error: null };
    // Most recent round (index 0) is treated as current
    mockData.rounds = { data: [currentRound], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members[0].roundsWon).toBe(0);
  });

  it('should count past round wins correctly', async () => {
    const alice = makeMember({ id: 'alice' });
    const bob = makeMember({ id: 'bob' });
    // Descending: round-2 is current, round-1 is past
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const songs = [
      makeSong({ id: 'alice-s1', member_id: 'alice', round_id: 'round-1' }),
      makeSong({ id: 'bob-s1', member_id: 'bob', round_id: 'round-1' }),
    ];
    const votes = [
      // Alice wins round 1 (higher avg)
      makeVote({ id: 'v1', song_id: 'alice-s1', member_id: 'bob', rating: 5 }),
      makeVote({ id: 'v2', song_id: 'bob-s1', member_id: 'alice', rating: 2 }),
    ];

    mockData.members = { data: [alice, bob], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: songs, error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const aliceStats = result.current.members.find((m) => m.id === 'alice')!;
    expect(aliceStats.roundsWon).toBe(1);
  });

  it('should build pastRounds summary excluding current round', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const song = makeSong({
      id: 'song-a',
      member_id: 'alice',
      round_id: 'round-1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
    });
    const votes = [makeVote({ id: 'v1', song_id: 'song-a', member_id: 'bob', rating: 4.5 })];

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pastRounds).toHaveLength(1);
    expect(result.current.pastRounds[0]).toEqual({
      number: 1,
      winner: 'Alice',
      topSong: 'Bohemian Rhapsody',
      topArtist: 'Queen',
      topScore: 4.5,
      songs: [
        {
          id: 'song-a',
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          thumbnail_url: null,
          memberName: 'Alice',
          avgRating: 4.5,
          totalVotes: 1,
        },
      ],
    });
  });

  it('should set error when members fetch fails', async () => {
    mockData.members = { data: null, error: { message: 'connection refused' } };
    mockData.rounds = { data: [], error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch members');
  });

  it('should return empty pastRounds when there is only current round', async () => {
    const alice = makeMember({ id: 'alice' });
    const currentRound = makeRound({ id: 'round-1', number: 1 });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound], error: null };
    mockData.songs = { data: [], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pastRounds).toEqual([]);
  });
});
