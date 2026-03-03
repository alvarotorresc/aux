import type { Member, Round, Song, Vote } from './types';

export type Quarter = 1 | 2 | 3 | 4;

export type WrappedPeriod =
  | { type: 'quarterly'; year: number; quarter: Quarter }
  | { type: 'annual'; year: number };

export interface WrappedSong {
  id: string;
  title: string;
  artist: string;
  thumbnail_url: string | null;
  genre: string | null;
  memberName: string;
  avgRating: number;
  totalVotes: number;
}

export interface WrappedMember {
  id: string;
  name: string;
  avatar: string;
  totalScore: number;
  songsAdded: number;
  avgReceived: number;
  roundsWon: number;
}

export interface GenreCount {
  genre: string;
  count: number;
}

export interface WrappedStats {
  period: WrappedPeriod;
  totalSongs: number;
  totalRounds: number;
  totalVotes: number;
  topSong: WrappedSong | null;
  topMembers: WrappedMember[];
  topSongs: WrappedSong[];
  genreDistribution: GenreCount[];
  topGenre: string | null;
}

/** Get the quarter (1-4) from a date. */
export function getQuarter(date: Date): Quarter {
  return (Math.floor(date.getMonth() / 3) + 1) as Quarter;
}

/** Filter rounds that fall within the given period. */
export function filterRoundsByPeriod(rounds: Round[], period: WrappedPeriod): Round[] {
  return rounds.filter((round) => {
    const date = new Date(round.starts_at);
    const year = date.getFullYear();
    if (period.type === 'annual') return year === period.year;
    return year === period.year && getQuarter(date) === period.quarter;
  });
}

/** Compute all wrapped stats from raw data. */
export function computeWrappedStats(
  period: WrappedPeriod,
  rounds: Round[],
  songs: Song[],
  votes: Vote[],
  members: Member[],
): WrappedStats {
  const periodRounds = filterRoundsByPeriod(rounds, period);
  const roundIds = new Set(periodRounds.map((r) => r.id));

  const periodSongs = songs.filter((s) => roundIds.has(s.round_id));
  const songIds = new Set(periodSongs.map((s) => s.id));
  const periodVotes = votes.filter((v) => songIds.has(v.song_id));

  // Compute avg rating per song
  const songStats = periodSongs.map((song) => {
    const songVotes = periodVotes.filter((v) => v.song_id === song.id);
    const total = songVotes.length;
    const avg = total > 0 ? songVotes.reduce((sum, v) => sum + v.rating, 0) / total : 0;
    const memberName = members.find((m) => m.id === song.member_id)?.name ?? '?';
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail_url: song.thumbnail_url,
      genre: song.genre,
      memberName,
      avgRating: avg,
      totalVotes: total,
    };
  });

  // Top song = highest avgRating with at least 1 vote
  const ratedSongs = songStats.filter((s) => s.totalVotes > 0);
  const sortedByRating = [...ratedSongs].sort((a, b) => b.avgRating - a.avgRating);
  const topSong = sortedByRating[0] ?? null;
  const topSongs = sortedByRating.slice(0, 5);

  // Find round winners (highest avg rating per round)
  const roundWins = new Map<string, number>();
  for (const round of periodRounds) {
    const roundSongs = songStats.filter((s) => {
      const original = periodSongs.find((ps) => ps.id === s.id);
      return original?.round_id === round.id;
    });
    const rated = roundSongs.filter((s) => s.totalVotes > 0);
    if (rated.length === 0) continue;
    const winner = rated.reduce((best, s) => (s.avgRating > best.avgRating ? s : best));
    const winnerId = periodSongs.find((s) => s.id === winner.id)?.member_id;
    if (winnerId) {
      roundWins.set(winnerId, (roundWins.get(winnerId) ?? 0) + 1);
    }
  }

  // Compute member stats
  const memberStats: WrappedMember[] = members.map((member) => {
    const memberSongs = periodSongs.filter((s) => s.member_id === member.id);
    let totalRatingsSum = 0;
    let totalRatingsCount = 0;
    for (const song of memberSongs) {
      const songVotes = periodVotes.filter((v) => v.song_id === song.id);
      for (const vote of songVotes) {
        totalRatingsSum += vote.rating;
        totalRatingsCount++;
      }
    }
    return {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      totalScore: totalRatingsSum,
      songsAdded: memberSongs.length,
      avgReceived: totalRatingsCount > 0 ? totalRatingsSum / totalRatingsCount : 0,
      roundsWon: roundWins.get(member.id) ?? 0,
    };
  });
  memberStats.sort((a, b) => b.totalScore - a.totalScore);

  // Genre distribution
  const genreCounts = new Map<string, number>();
  for (const song of periodSongs) {
    if (song.genre) {
      genreCounts.set(song.genre, (genreCounts.get(song.genre) ?? 0) + 1);
    }
  }
  const genreDistribution: GenreCount[] = [...genreCounts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  const topGenre = genreDistribution[0]?.genre ?? null;

  return {
    period,
    totalSongs: periodSongs.length,
    totalRounds: periodRounds.length,
    totalVotes: periodVotes.length,
    topSong,
    topMembers: memberStats,
    topSongs,
    genreDistribution,
    topGenre,
  };
}

/** Get available periods for a group given its rounds. */
export function getAvailablePeriods(rounds: Round[]): WrappedPeriod[] {
  const quarterSet = new Set<string>();
  const yearSet = new Set<number>();

  for (const round of rounds) {
    const date = new Date(round.starts_at);
    const year = date.getFullYear();
    const quarter = getQuarter(date);
    quarterSet.add(`${year}-${quarter}`);
    yearSet.add(year);
  }

  const periods: WrappedPeriod[] = [];

  // Quarterly periods
  for (const key of quarterSet) {
    const [yearStr, quarterStr] = key.split('-');
    periods.push({
      type: 'quarterly',
      year: Number(yearStr),
      quarter: Number(quarterStr) as Quarter,
    });
  }

  // Annual periods
  for (const year of yearSet) {
    periods.push({ type: 'annual', year });
  }

  // Sort: most recent first. Annual after quarterly for same year.
  periods.sort((a, b) => {
    const yearA = a.year;
    const yearB = b.year;
    if (yearA !== yearB) return yearB - yearA;
    // Same year: quarterly before annual
    if (a.type === 'quarterly' && b.type === 'annual') return -1;
    if (a.type === 'annual' && b.type === 'quarterly') return 1;
    // Both quarterly: higher quarter first
    if (a.type === 'quarterly' && b.type === 'quarterly') return b.quarter - a.quarter;
    return 0;
  });

  return periods;
}

/** Format period label: "Q1 2026" or "2025". */
export function formatPeriodLabel(period: WrappedPeriod): string {
  if (period.type === 'annual') return String(period.year);
  return `Q${period.quarter} ${period.year}`;
}
