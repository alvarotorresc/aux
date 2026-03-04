import { describe, it, expect } from 'vitest';
import { computeMemberStats } from '../scoring';
import type { Member, Round, Song, Vote } from '../types';

// --- Factories ---

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    group_id: 'group-1',
    name: 'Alice',
    avatar: 'https://example.com/avatar.png',
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
    rating: 5,
    created_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

// --- Tests ---

describe('computeMemberStats', () => {
  it('should return totalScore as the sum of all ratings received across all songs', () => {
    const member = makeMember({ id: 'member-1' });
    const round = makeRound({ id: 'round-1', number: 1 });
    // round-1 is the "current" round (index 0, most recent) — wins excluded from it
    const song = makeSong({ id: 'song-1', member_id: 'member-1', round_id: 'round-1' });
    const votes = [
      makeVote({ id: 'v1', song_id: 'song-1', rating: 8 }),
      makeVote({ id: 'v2', song_id: 'song-1', rating: 6 }),
    ];

    const [stats] = computeMemberStats([member], [round], [song], votes);

    expect(stats.totalScore).toBe(14); // 8 + 6
  });

  it('should calculate avgReceived as the mean rating across all songs', () => {
    const member = makeMember({ id: 'member-1' });
    const round = makeRound({ id: 'round-1' });
    const song1 = makeSong({ id: 'song-1', member_id: 'member-1', round_id: 'round-1' });
    const song2 = makeSong({ id: 'song-2', member_id: 'member-1', round_id: 'round-1' });
    const votes = [
      makeVote({ id: 'v1', song_id: 'song-1', rating: 10 }),
      makeVote({ id: 'v2', song_id: 'song-2', rating: 4 }),
    ];

    const [stats] = computeMemberStats([member], [round], [song1, song2], votes);

    // avg = (10 + 4) / 2 = 7
    expect(stats.avgReceived).toBe(7);
  });

  it('should calculate roundsWon by counting past rounds where the member had the highest average', () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const bob = makeMember({ id: 'bob', name: 'Bob' });

    // Rounds ordered descending: round-3 is current (index 0), round-2 and round-1 are past
    const currentRound = makeRound({ id: 'round-3', number: 3 });
    const pastRound2 = makeRound({ id: 'round-2', number: 2 });
    const pastRound1 = makeRound({ id: 'round-1', number: 1 });

    const aliceSong1 = makeSong({ id: 'alice-s1', member_id: 'alice', round_id: 'round-1' });
    const bobSong1 = makeSong({ id: 'bob-s1', member_id: 'bob', round_id: 'round-1' });
    const aliceSong2 = makeSong({ id: 'alice-s2', member_id: 'alice', round_id: 'round-2' });
    const aliceSongCurrent = makeSong({
      id: 'alice-current',
      member_id: 'alice',
      round_id: 'round-3',
    });

    const votes = [
      // Round 1: Alice wins (avg 9 vs Bob avg 5)
      makeVote({ id: 'v1', song_id: 'alice-s1', rating: 9 }),
      makeVote({ id: 'v2', song_id: 'bob-s1', rating: 5 }),
      // Round 2: Alice wins (only song with votes)
      makeVote({ id: 'v3', song_id: 'alice-s2', rating: 8 }),
      // Current round: should not count
      makeVote({ id: 'v4', song_id: 'alice-current', rating: 10 }),
    ];

    const stats = computeMemberStats(
      [alice, bob],
      [currentRound, pastRound2, pastRound1],
      [aliceSong1, bobSong1, aliceSong2, aliceSongCurrent],
      votes,
    );

    const aliceStats = stats.find((s) => s.id === 'alice')!;
    expect(aliceStats.roundsWon).toBe(2);
  });

  it('should return score 0 for a member with no songs', () => {
    const member = makeMember({ id: 'member-1' });
    const round = makeRound({ id: 'round-1' });

    const [stats] = computeMemberStats([member], [round], [], []);

    expect(stats.totalScore).toBe(0);
    expect(stats.songsAdded).toBe(0);
    expect(stats.avgReceived).toBe(0);
    expect(stats.roundsWon).toBe(0);
  });

  it('should return avgReceived 0 and totalScore 0 when a song has no votes', () => {
    const member = makeMember({ id: 'member-1' });
    const round = makeRound({ id: 'round-1' });
    const song = makeSong({ id: 'song-1', member_id: 'member-1', round_id: 'round-1' });

    const [stats] = computeMemberStats([member], [round], [song], []);

    expect(stats.totalScore).toBe(0);
    expect(stats.avgReceived).toBe(0);
    expect(stats.songsAdded).toBe(1);
  });

  it('should sort members by totalScore descending', () => {
    const alice = makeMember({ id: 'alice', name: 'Alice' });
    const bob = makeMember({ id: 'bob', name: 'Bob' });
    const round = makeRound({ id: 'round-1' });
    const aliceSong = makeSong({ id: 'song-alice', member_id: 'alice', round_id: 'round-1' });
    const bobSong = makeSong({ id: 'song-bob', member_id: 'bob', round_id: 'round-1' });
    const votes = [
      makeVote({ id: 'v1', song_id: 'song-alice', rating: 3 }),
      makeVote({ id: 'v2', song_id: 'song-bob', rating: 9 }),
    ];

    const stats = computeMemberStats([alice, bob], [round], [aliceSong, bobSong], votes);

    expect(stats[0].id).toBe('bob');
    expect(stats[1].id).toBe('alice');
  });

  it('should not count the current round (index 0) toward roundsWon', () => {
    const member = makeMember({ id: 'member-1' });
    const currentRound = makeRound({ id: 'round-current', number: 5 });
    const song = makeSong({ id: 'song-1', member_id: 'member-1', round_id: 'round-current' });
    const votes = [makeVote({ id: 'v1', song_id: 'song-1', rating: 10 })];

    // Only the current round exists — it should never generate a win
    const [stats] = computeMemberStats([member], [currentRound], [song], votes);

    expect(stats.roundsWon).toBe(0);
  });

  it('should return empty array when there are no members', () => {
    const round = makeRound();
    const result = computeMemberStats([], [round], [], []);

    expect(result).toEqual([]);
  });

  it('should return 0 roundsWon when past round has empty songs array', () => {
    const alice = makeMember({ id: 'alice' });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    // No songs in the past round at all

    const [stats] = computeMemberStats([alice], [currentRound, pastRound], [], []);

    expect(stats.roundsWon).toBe(0);
  });

  it('should return 0 roundsWon when all songs in a past round have zero votes', () => {
    const alice = makeMember({ id: 'alice' });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    const song = makeSong({ id: 'song-1', member_id: 'alice', round_id: 'round-1' });
    // No votes at all — every song has total === 0

    const [stats] = computeMemberStats([alice], [currentRound, pastRound], [song], []);

    expect(stats.roundsWon).toBe(0);
  });

  it('should return 0 roundsWon when winning song member does not exist in members list', () => {
    const alice = makeMember({ id: 'alice' });
    const currentRound = makeRound({ id: 'round-2', number: 2 });
    const pastRound = makeRound({ id: 'round-1', number: 1 });
    // Song belongs to 'ghost' who is NOT in the members array
    const song = makeSong({ id: 'song-1', member_id: 'ghost', round_id: 'round-1' });
    const votes = [makeVote({ id: 'v1', song_id: 'song-1', member_id: 'alice', rating: 5 })];

    const [stats] = computeMemberStats([alice], [currentRound, pastRound], [song], votes);

    // ghost would win but doesn't exist in members, so findRoundWinner returns null
    expect(stats.roundsWon).toBe(0);
  });
});
