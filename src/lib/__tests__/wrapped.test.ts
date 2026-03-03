import { describe, it, expect } from 'vitest';
import type { Member, Round, Song, Vote } from '../types';
import {
  getQuarter,
  filterRoundsByPeriod,
  computeWrappedStats,
  getAvailablePeriods,
  formatPeriodLabel,
  type WrappedPeriod,
} from '../wrapped';

// --- Factories ---

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-1',
    group_id: 'group-1',
    number: 1,
    starts_at: '2026-01-15T00:00:00Z',
    ends_at: '2026-01-22T00:00:00Z',
    created_at: '2026-01-15T00:00:00Z',
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
    genre: 'rock',
    created_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: 'vote-1',
    song_id: 'song-1',
    member_id: 'member-2',
    rating: 4,
    created_at: '2026-01-16T00:00:00Z',
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

// --- Tests ---

describe('getQuarter', () => {
  it('returns 1 for January', () => {
    expect(getQuarter(new Date('2026-01-15'))).toBe(1);
  });

  it('returns 1 for March', () => {
    expect(getQuarter(new Date('2026-03-31'))).toBe(1);
  });

  it('returns 2 for April', () => {
    expect(getQuarter(new Date('2026-04-01'))).toBe(2);
  });

  it('returns 2 for June', () => {
    expect(getQuarter(new Date('2026-06-30'))).toBe(2);
  });

  it('returns 3 for July', () => {
    expect(getQuarter(new Date('2026-07-01'))).toBe(3);
  });

  it('returns 4 for October', () => {
    expect(getQuarter(new Date('2026-10-15'))).toBe(4);
  });

  it('returns 4 for December', () => {
    expect(getQuarter(new Date('2026-12-31'))).toBe(4);
  });
});

describe('filterRoundsByPeriod', () => {
  const rounds: Round[] = [
    makeRound({ id: 'r1', starts_at: '2026-01-15T00:00:00Z' }),
    makeRound({ id: 'r2', starts_at: '2026-02-15T00:00:00Z' }),
    makeRound({ id: 'r3', starts_at: '2026-04-15T00:00:00Z' }),
    makeRound({ id: 'r4', starts_at: '2026-07-15T00:00:00Z' }),
    makeRound({ id: 'r5', starts_at: '2025-10-15T00:00:00Z' }),
  ];

  it('filters by Q1 correctly', () => {
    const result = filterRoundsByPeriod(rounds, { type: 'quarterly', year: 2026, quarter: 1 });
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('filters by Q2 correctly', () => {
    const result = filterRoundsByPeriod(rounds, { type: 'quarterly', year: 2026, quarter: 2 });
    expect(result.map((r) => r.id)).toEqual(['r3']);
  });

  it('filters by Q3 correctly', () => {
    const result = filterRoundsByPeriod(rounds, { type: 'quarterly', year: 2026, quarter: 3 });
    expect(result.map((r) => r.id)).toEqual(['r4']);
  });

  it('filters by Q4 of different year', () => {
    const result = filterRoundsByPeriod(rounds, { type: 'quarterly', year: 2025, quarter: 4 });
    expect(result.map((r) => r.id)).toEqual(['r5']);
  });

  it('filters by year for annual period', () => {
    const result = filterRoundsByPeriod(rounds, { type: 'annual', year: 2026 });
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('returns empty for no matching rounds', () => {
    const result = filterRoundsByPeriod(rounds, { type: 'quarterly', year: 2024, quarter: 1 });
    expect(result).toEqual([]);
  });

  it('handles empty rounds array', () => {
    const result = filterRoundsByPeriod([], { type: 'annual', year: 2026 });
    expect(result).toEqual([]);
  });
});

describe('computeWrappedStats', () => {
  const members: Member[] = [
    makeMember({ id: 'm1', name: 'Alice', avatar: '🎵' }),
    makeMember({ id: 'm2', name: 'Bob', avatar: '🎸' }),
  ];

  const rounds: Round[] = [
    makeRound({ id: 'r1', number: 1, starts_at: '2026-01-10T00:00:00Z' }),
    makeRound({ id: 'r2', number: 2, starts_at: '2026-02-10T00:00:00Z' }),
  ];

  const songs: Song[] = [
    makeSong({ id: 's1', round_id: 'r1', member_id: 'm1', genre: 'rock' }),
    makeSong({ id: 's2', round_id: 'r1', member_id: 'm2', genre: 'pop' }),
    makeSong({ id: 's3', round_id: 'r2', member_id: 'm1', genre: 'rock' }),
    makeSong({ id: 's4', round_id: 'r2', member_id: 'm2', genre: 'jazz' }),
  ];

  const votes: Vote[] = [
    makeVote({ id: 'v1', song_id: 's1', member_id: 'm2', rating: 4 }),
    makeVote({ id: 'v2', song_id: 's2', member_id: 'm1', rating: 3 }),
    makeVote({ id: 'v3', song_id: 's3', member_id: 'm2', rating: 5 }),
    makeVote({ id: 'v4', song_id: 's4', member_id: 'm1', rating: 2 }),
  ];

  const period: WrappedPeriod = { type: 'quarterly', year: 2026, quarter: 1 };

  it('computes totalSongs correctly', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.totalSongs).toBe(4);
  });

  it('computes totalRounds correctly', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.totalRounds).toBe(2);
  });

  it('computes totalVotes correctly', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.totalVotes).toBe(4);
  });

  it('identifies topSong by highest avgRating', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.topSong).not.toBeNull();
    expect(stats.topSong!.id).toBe('s3');
    expect(stats.topSong!.avgRating).toBe(5);
  });

  it('sorts topMembers by totalScore desc', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.topMembers[0].name).toBe('Alice');
    expect(stats.topMembers[0].totalScore).toBe(9); // 4 + 5
    expect(stats.topMembers[1].name).toBe('Bob');
    expect(stats.topMembers[1].totalScore).toBe(5); // 3 + 2
  });

  it('computes member songsAdded correctly', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    const alice = stats.topMembers.find((m) => m.name === 'Alice')!;
    expect(alice.songsAdded).toBe(2);
  });

  it('computes member avgReceived correctly', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    const alice = stats.topMembers.find((m) => m.name === 'Alice')!;
    expect(alice.avgReceived).toBe(4.5); // (4 + 5) / 2
  });

  it('computes roundsWon correctly', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    const alice = stats.topMembers.find((m) => m.name === 'Alice')!;
    expect(alice.roundsWon).toBe(2); // won both rounds
  });

  it('computes genreDistribution sorted by count', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.genreDistribution[0]).toEqual({ genre: 'rock', count: 2 });
    expect(stats.genreDistribution).toHaveLength(3);
  });

  it('identifies topGenre as most common genre', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.topGenre).toBe('rock');
  });

  it('returns topSongs sorted by avgRating desc, max 5', () => {
    const stats = computeWrappedStats(period, rounds, songs, votes, members);
    expect(stats.topSongs.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < stats.topSongs.length; i++) {
      expect(stats.topSongs[i - 1].avgRating).toBeGreaterThanOrEqual(stats.topSongs[i].avgRating);
    }
  });

  it('handles empty data gracefully', () => {
    const stats = computeWrappedStats(period, [], [], [], []);
    expect(stats.totalSongs).toBe(0);
    expect(stats.totalRounds).toBe(0);
    expect(stats.totalVotes).toBe(0);
    expect(stats.topSong).toBeNull();
    expect(stats.topMembers).toEqual([]);
    expect(stats.topSongs).toEqual([]);
    expect(stats.genreDistribution).toEqual([]);
    expect(stats.topGenre).toBeNull();
  });

  it('ignores songs with null genre in genreDistribution', () => {
    const songsWithNull: Song[] = [
      makeSong({ id: 's1', round_id: 'r1', member_id: 'm1', genre: null }),
      makeSong({ id: 's2', round_id: 'r1', member_id: 'm2', genre: 'pop' }),
    ];
    const stats = computeWrappedStats(period, rounds, songsWithNull, [], members);
    expect(stats.genreDistribution).toEqual([{ genre: 'pop', count: 1 }]);
  });

  it('returns null topSong when no songs have votes', () => {
    const stats = computeWrappedStats(period, rounds, songs, [], members);
    expect(stats.topSong).toBeNull();
  });

  it('excludes songs from rounds outside the period', () => {
    const q2Round = makeRound({ id: 'r-q2', number: 3, starts_at: '2026-04-15T00:00:00Z' });
    const q2Song = makeSong({ id: 's-q2', round_id: 'r-q2', member_id: 'm1', genre: 'jazz' });
    const q2Vote = makeVote({ id: 'v-q2', song_id: 's-q2', member_id: 'm2', rating: 5 });

    const allRounds = [...rounds, q2Round];
    const allSongs = [...songs, q2Song];
    const allVotes = [...votes, q2Vote];

    const stats = computeWrappedStats(period, allRounds, allSongs, allVotes, members);
    // Q1 period should NOT include the Q2 round/song/vote
    expect(stats.totalSongs).toBe(4);
    expect(stats.totalRounds).toBe(2);
    expect(stats.totalVotes).toBe(4);
  });

  it('computes avg correctly with multiple votes per song', () => {
    const multiVotes: Vote[] = [
      makeVote({ id: 'v1', song_id: 's1', member_id: 'm2', rating: 3 }),
      makeVote({ id: 'v2', song_id: 's1', member_id: 'm1', rating: 4 }),
      makeVote({ id: 'v3', song_id: 's1', member_id: 'm2', rating: 5 }),
    ];
    const oneSong: Song[] = [makeSong({ id: 's1', round_id: 'r1', member_id: 'm1' })];
    const stats = computeWrappedStats(period, rounds, oneSong, multiVotes, members);
    expect(stats.topSong!.avgRating).toBe(4); // (3 + 4 + 5) / 3
    expect(stats.topSong!.totalVotes).toBe(3);
  });

  it('caps topSongs at 5 with more than 5 rated songs', () => {
    const manySongs: Song[] = Array.from({ length: 7 }, (_, i) =>
      makeSong({ id: `s${i}`, round_id: 'r1', member_id: 'm1', genre: 'rock' }),
    );
    const manyVotes: Vote[] = manySongs.map((s, i) =>
      makeVote({ id: `v${i}`, song_id: s.id, member_id: 'm2', rating: 5 - i * 0.5 }),
    );
    const stats = computeWrappedStats(period, rounds, manySongs, manyVotes, members);
    expect(stats.topSongs).toHaveLength(5);
  });

  it('returns zero stats for member with songs only outside period', () => {
    const q2Round = makeRound({ id: 'r-q2', number: 3, starts_at: '2026-04-15T00:00:00Z' });
    const q2Song = makeSong({ id: 's-q2', round_id: 'r-q2', member_id: 'm2' });
    const stats = computeWrappedStats(
      period,
      [q2Round],
      [q2Song],
      [],
      [makeMember({ id: 'm2', name: 'Bob' })],
    );
    expect(stats.topMembers[0].songsAdded).toBe(0);
    expect(stats.topMembers[0].avgReceived).toBe(0);
    expect(stats.topMembers[0].roundsWon).toBe(0);
  });
});

describe('getAvailablePeriods', () => {
  it('generates quarterly and annual periods', () => {
    const rounds: Round[] = [
      makeRound({ id: 'r1', starts_at: '2026-01-15T00:00:00Z' }),
      makeRound({ id: 'r2', starts_at: '2026-04-15T00:00:00Z' }),
    ];
    const periods = getAvailablePeriods(rounds);
    expect(periods).toHaveLength(3); // Q1 2026, Q2 2026, 2026
  });

  it('orders most recent first', () => {
    const rounds: Round[] = [
      makeRound({ id: 'r1', starts_at: '2025-07-15T00:00:00Z' }),
      makeRound({ id: 'r2', starts_at: '2026-01-15T00:00:00Z' }),
    ];
    const periods = getAvailablePeriods(rounds);
    // 2026: Q1 2026, 2026, Q3 2025, 2025
    expect(periods[0]).toEqual({ type: 'quarterly', year: 2026, quarter: 1 });
    expect(periods[1]).toEqual({ type: 'annual', year: 2026 });
    expect(periods[2]).toEqual({ type: 'quarterly', year: 2025, quarter: 3 });
    expect(periods[3]).toEqual({ type: 'annual', year: 2025 });
  });

  it('returns empty for no rounds', () => {
    expect(getAvailablePeriods([])).toEqual([]);
  });

  it('deduplicates quarters from multiple rounds in same quarter', () => {
    const rounds: Round[] = [
      makeRound({ id: 'r1', starts_at: '2026-01-10T00:00:00Z' }),
      makeRound({ id: 'r2', starts_at: '2026-02-10T00:00:00Z' }),
    ];
    const periods = getAvailablePeriods(rounds);
    const q1Count = periods.filter(
      (p) => p.type === 'quarterly' && p.year === 2026 && p.quarter === 1,
    ).length;
    expect(q1Count).toBe(1);
  });
});

describe('formatPeriodLabel', () => {
  it('formats quarterly period', () => {
    expect(formatPeriodLabel({ type: 'quarterly', year: 2026, quarter: 1 })).toBe('Q1 2026');
  });

  it('formats Q4 period', () => {
    expect(formatPeriodLabel({ type: 'quarterly', year: 2025, quarter: 4 })).toBe('Q4 2025');
  });

  it('formats annual period', () => {
    expect(formatPeriodLabel({ type: 'annual', year: 2025 })).toBe('2025');
  });
});
