// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLeaderboard } from '../useLeaderboard';
import type { Member, Round, Song, Vote } from '../../../lib/types';

// --- Configurable supabase mock ---

let mockData: {
  members: { data: Member[] | null; error: unknown };
  rounds: { data: Round[] | null; error: unknown };
  songs: { data: Song[] | null; error: unknown };
  votes: { data: Vote[] | null; error: unknown };
};

let mockOverrides: Record<string, (() => Promise<unknown>) | null> = {};

function resetMockData() {
  mockData = {
    members: { data: [], error: null },
    rounds: { data: [], error: null },
    songs: { data: [], error: null },
    votes: { data: [], error: null },
  };
  mockOverrides = {};
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
      const resolve = () => {
        if (mockOverrides[table]) return mockOverrides[table]!();
        return Promise.resolve(tableData());
      };

      // Build a chainable mock that always resolves with the table's data
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.in = () => resolve();
      chain.order = () => resolve();
      chain.then = (fn: (v: unknown) => void, rej?: (r: unknown) => void) =>
        resolve().then(fn, rej);

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
    genre: null,
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
      topGenre: null,
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

  it('should set error when rounds fetch fails', async () => {
    mockData.members = { data: [], error: null };
    mockData.rounds = { data: null, error: { message: 'rounds timeout' } };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch rounds');
  });

  it('should set error when songs fetch fails', async () => {
    const alice = makeMember({ id: 'alice' });
    const round = makeRound({ id: 'round-1', number: 1 });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [round], error: null };
    mockData.songs = { data: null, error: { message: 'songs timeout' } };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch songs');
  });

  it('should set error when votes fetch fails', async () => {
    const alice = makeMember({ id: 'alice' });
    const round = makeRound({ id: 'round-1', number: 1 });
    const song = makeSong({ id: 'song-1', member_id: 'alice', round_id: 'round-1' });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [round], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: null, error: { message: 'votes timeout' } };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch votes');
  });

  it('should sort currentRoundSongs by avgRating desc then by totalVotes desc as tiebreaker', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const bob = makeMember({ id: 'bob', name: 'Bob' });
    const carol = makeMember({ id: 'carol', name: 'Carol' });
    const currentRound = makeRound({ id: 'round-1', number: 1 });

    // Three songs in the current round
    const songA = makeSong({
      id: 'song-a',
      member_id: 'alice',
      round_id: 'round-1',
      title: 'Song A',
    });
    const songB = makeSong({
      id: 'song-b',
      member_id: 'bob',
      round_id: 'round-1',
      title: 'Song B',
    });
    const songC = makeSong({
      id: 'song-c',
      member_id: 'carol',
      round_id: 'round-1',
      title: 'Song C',
    });

    // Song A: avg 4.0 (2 votes) — same avg as Song B but more votes
    // Song B: avg 4.0 (1 vote)
    // Song C: avg 3.0 (1 vote)
    const votes = [
      makeVote({ id: 'v1', song_id: 'song-a', member_id: 'bob', rating: 4 }),
      makeVote({ id: 'v2', song_id: 'song-a', member_id: 'carol', rating: 4 }),
      makeVote({ id: 'v3', song_id: 'song-b', member_id: 'alice', rating: 4 }),
      makeVote({ id: 'v4', song_id: 'song-c', member_id: 'alice', rating: 3 }),
    ];

    mockData.members = { data: [alice, bob, carol], error: null };
    mockData.rounds = { data: [currentRound], error: null };
    mockData.songs = { data: [songA, songB, songC], error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Song A and Song B have same avgRating (4.0), but Song A has 2 votes vs 1
    expect(result.current.currentRoundSongs).toHaveLength(3);
    expect(result.current.currentRoundSongs[0].title).toBe('Song A'); // avg 4.0, 2 votes
    expect(result.current.currentRoundSongs[1].title).toBe('Song B'); // avg 4.0, 1 vote
    expect(result.current.currentRoundSongs[2].title).toBe('Song C'); // avg 3.0, 1 vote
  });

  it('should set currentRoundNumber correctly', async () => {
    const alice = makeMember({ id: 'alice' });
    const currentRound = makeRound({ id: 'round-5', number: 5 });
    const pastRound = makeRound({ id: 'round-4', number: 4 });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: [], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentRoundNumber).toBe(5);
  });

  it('should show winner as dash when past round has no votes', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const song = makeSong({
      id: 'song-a',
      member_id: 'alice',
      round_id: 'round-1',
      title: 'Unvoted Song',
      artist: 'Artist',
    });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pastRounds).toHaveLength(1);
    expect(result.current.pastRounds[0].winner).toBe('\u2014');
  });

  it('should show winner as dash when winning member does not exist in members list', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    // Song belongs to 'ghost' who is NOT in the members list
    const song = makeSong({
      id: 'song-a',
      member_id: 'ghost',
      round_id: 'round-1',
      title: 'Ghost Song',
      artist: 'Ghost Artist',
    });
    const votes = [makeVote({ id: 'v1', song_id: 'song-a', member_id: 'alice', rating: 5 })];

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound, pastRound], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pastRounds).toHaveLength(1);
    // findRoundWinner returns null because member 'ghost' doesn't exist
    expect(result.current.pastRounds[0].winner).toBe('\u2014');
  });

  it('should compute top 5 songs of all time from completed rounds only', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const bob = makeMember({ id: 'bob', name: 'Bob' });
    const currentRound = makeRound({ id: 'round-3', number: 3 });
    const pastRound1 = makeRound({ id: 'round-1', number: 1 });
    const pastRound2 = makeRound({ id: 'round-2', number: 2 });

    // 6 songs across past rounds + 1 in current
    const songs = [
      makeSong({ id: 's1', member_id: 'alice', round_id: 'round-1', title: 'Song 1' }),
      makeSong({ id: 's2', member_id: 'alice', round_id: 'round-1', title: 'Song 2' }),
      makeSong({ id: 's3', member_id: 'bob', round_id: 'round-1', title: 'Song 3' }),
      makeSong({ id: 's4', member_id: 'alice', round_id: 'round-2', title: 'Song 4' }),
      makeSong({ id: 's5', member_id: 'bob', round_id: 'round-2', title: 'Song 5' }),
      makeSong({ id: 's6', member_id: 'bob', round_id: 'round-2', title: 'Song 6' }),
      makeSong({ id: 's7', member_id: 'alice', round_id: 'round-3', title: 'Current Song' }),
    ];

    const votes = [
      makeVote({ id: 'v1', song_id: 's1', member_id: 'bob', rating: 5 }),
      makeVote({ id: 'v2', song_id: 's2', member_id: 'bob', rating: 4 }),
      makeVote({ id: 'v3', song_id: 's3', member_id: 'alice', rating: 3 }),
      makeVote({ id: 'v4', song_id: 's4', member_id: 'bob', rating: 4.5 }),
      makeVote({ id: 'v5', song_id: 's5', member_id: 'alice', rating: 2 }),
      makeVote({ id: 'v6', song_id: 's6', member_id: 'alice', rating: 3.5 }),
      // Current round song — should NOT be in top songs
      makeVote({ id: 'v7', song_id: 's7', member_id: 'bob', rating: 5 }),
    ];

    mockData.members = { data: [alice, bob], error: null };
    mockData.rounds = { data: [currentRound, pastRound2, pastRound1], error: null };
    mockData.songs = { data: songs, error: null };
    mockData.votes = { data: votes, error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Top songs should be from completed rounds only, sorted by avgRating desc
    expect(result.current.topSongs.length).toBeLessThanOrEqual(5);
    expect(result.current.topSongs[0].title).toBe('Song 1'); // avg 5
    expect(result.current.topSongs[0].avgRating).toBe(5);
    // Current round song should not appear
    expect(result.current.topSongs.every((s) => s.title !== 'Current Song')).toBe(true);
  });

  it('should show ? as memberName when song member is not in members list for current round', async () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const currentRound = makeRound({ id: 'round-1', number: 1 });
    // Song belongs to 'unknown' who is NOT in members
    const song = makeSong({
      id: 'song-a',
      member_id: 'unknown',
      round_id: 'round-1',
      title: 'Mystery',
    });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [currentRound], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentRoundSongs).toHaveLength(1);
    expect(result.current.currentRoundSongs[0].memberName).toBe('?');
  });

  it('should set generic error message when non-Error is thrown', async () => {
    // Hijack mockData so that accessing members throws a non-Error value
    const originalMembers = mockData.members;
    Object.defineProperty(mockData, 'members', {
      get: () => {
        Object.defineProperty(mockData, 'members', {
          value: originalMembers,
          writable: true,
          configurable: true,
        });
        throw 'string error, not an Error instance';
      },
      configurable: true,
    });

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load leaderboard');
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

  it('should handle null data with no error gracefully (defensive null coalescing)', async () => {
    // Simulate edge case where supabase returns null data without an error
    const round = makeRound({ id: 'round-1', number: 1 });

    mockData.members = { data: null, error: null }; // null data, no error
    mockData.rounds = { data: [round], error: null };
    mockData.songs = { data: null, error: null }; // null data, no error
    mockData.votes = { data: null, error: null }; // null data, no error

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should handle gracefully with empty arrays
    expect(result.current.members).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle null rounds data gracefully', async () => {
    mockData.members = { data: [], error: null };
    mockData.rounds = { data: null, error: null }; // null data, no error

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // null rounds → empty array → roundIds.length === 0 → early return
    expect(result.current.members).toEqual([]);
    expect(result.current.pastRounds).toEqual([]);
  });

  it('should handle null votes data gracefully when songs exist', async () => {
    const alice = makeMember({ id: 'alice' });
    const round = makeRound({ id: 'round-1', number: 1 });
    const song = makeSong({ id: 'song-1', member_id: 'alice', round_id: 'round-1' });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [round], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: null, error: null }; // null data, no error

    const { result } = renderHook(() => useLeaderboard('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should handle null votes as empty array
    expect(result.current.error).toBeNull();
  });

  it('should not update state when unmounted during fetch', async () => {
    let resolveMembers!: (value: unknown) => void;
    mockOverrides.members = () =>
      new Promise((resolve) => {
        resolveMembers = resolve;
      });
    mockData.rounds = { data: [], error: null };

    const { result, unmount } = renderHook(() => useLeaderboard('group-1'));

    // Wait for microtask to set up the deferred promise
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isLoading).toBe(true);

    unmount();

    await act(async () => {
      resolveMembers({ data: [], error: null });
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('should not set error when unmounted during catch', async () => {
    let rejectMembers!: (reason: unknown) => void;
    mockOverrides.members = () =>
      new Promise((_resolve, reject) => {
        rejectMembers = reject;
      });
    mockData.rounds = { data: [], error: null };

    const { result, unmount } = renderHook(() => useLeaderboard('group-1'));

    // Wait for microtask to set up the deferred promise
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isLoading).toBe(true);

    unmount();

    await act(async () => {
      rejectMembers(new Error('network error'));
      await new Promise((r) => setTimeout(r, 0));
    });
  });
});
