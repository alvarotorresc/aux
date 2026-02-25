import type { Member, MemberStats, Round, Song, Vote } from './types';

/**
 * Compute per-song average rating from its votes.
 */
function computeSongAvg(songId: string, votes: Vote[]): { avg: number; total: number } {
  const songVotes = votes.filter((v) => v.song_id === songId);
  const total = songVotes.length;
  if (total === 0) return { avg: 0, total: 0 };
  const avg = songVotes.reduce((sum, v) => sum + v.rating, 0) / total;
  return { avg, total };
}

/**
 * Given a round's songs and all votes, find the winner:
 * the member whose song has the highest average rating (with at least 1 vote).
 */
function findRoundWinner(
  roundSongs: Song[],
  votes: Vote[],
  members: Member[],
): { winnerId: string; topSong: Song; topScore: number } | null {
  if (roundSongs.length === 0) return null;

  let best: { song: Song; avg: number } | null = null;

  for (const song of roundSongs) {
    const { avg, total } = computeSongAvg(song.id, votes);
    if (total === 0) continue;
    if (!best || avg > best.avg) {
      best = { song, avg };
    }
  }

  if (!best) return null;

  const memberExists = members.some((m) => m.id === best!.song.member_id);
  if (!memberExists) return null;

  return {
    winnerId: best.song.member_id,
    topSong: best.song,
    topScore: best.avg,
  };
}

/**
 * Given raw members, rounds, songs, and votes, compute per-member stats.
 *
 * The most recent round (by position in the rounds array, index 0) is treated
 * as the "current" round and is excluded from roundsWon counts.
 *
 * Rounds must be ordered descending by number (most recent first) — matching
 * the order returned by the Supabase query in useLeaderboard.
 *
 * Returns MemberStats[] sorted by totalScore descending.
 */
export function computeMemberStats(
  members: Member[],
  rounds: Round[],
  songs: Song[],
  votes: Vote[],
): MemberStats[] {
  const currentRound = rounds.length > 0 ? rounds[0] : null;
  const roundWins = new Map<string, number>();

  for (const round of rounds) {
    const isCurrentRound = currentRound && round.id === currentRound.id;
    if (isCurrentRound) continue;

    const roundSongs = songs.filter((s) => s.round_id === round.id);
    const winner = findRoundWinner(roundSongs, votes, members);
    if (winner) {
      roundWins.set(winner.winnerId, (roundWins.get(winner.winnerId) ?? 0) + 1);
    }
  }

  const memberStats: MemberStats[] = members.map((member) => {
    const memberSongs = songs.filter((s) => s.member_id === member.id);
    const songsAdded = memberSongs.length;

    let totalRatingsSum = 0;
    let totalRatingsCount = 0;

    for (const song of memberSongs) {
      const songVotes = votes.filter((v) => v.song_id === song.id);
      for (const vote of songVotes) {
        totalRatingsSum += vote.rating;
        totalRatingsCount++;
      }
    }

    const avgReceived = totalRatingsCount > 0 ? totalRatingsSum / totalRatingsCount : 0;
    const roundsWon = roundWins.get(member.id) ?? 0;

    return {
      ...member,
      totalScore: totalRatingsSum,
      songsAdded,
      avgReceived,
      roundsWon,
    };
  });

  memberStats.sort((a, b) => b.totalScore - a.totalScore);

  return memberStats;
}
