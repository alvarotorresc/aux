import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Member, MemberStats, Round, Song, Vote } from '../../lib/types';

export interface PastRound {
  number: number;
  winner: string;
  topSong: string;
  topArtist: string;
  topScore: number;
}

interface UseLeaderboardResult {
  members: MemberStats[];
  pastRounds: PastRound[];
  isLoading: boolean;
  error: string | null;
}

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

  // Verify the member still exists
  const memberExists = members.some((m) => m.id === best!.song.member_id);
  if (!memberExists) return null;

  return {
    winnerId: best.song.member_id,
    topSong: best.song,
    topScore: best.avg,
  };
}

/**
 * Hook that fetches all group data and computes leaderboard rankings.
 *
 * For each member calculates:
 * - totalScore: sum of all ratings received across all their songs
 * - songsAdded: total songs submitted
 * - avgReceived: average rating received across all their songs
 * - roundsWon: number of rounds where their song had the highest avg rating
 *
 * Also computes past rounds summary (excluding the current week's round).
 */
export function useLeaderboard(groupId: string): UseLeaderboardResult {
  const [members, setMembers] = useState<MemberStats[]>([]);
  const [pastRounds, setPastRounds] = useState<PastRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [membersRes, roundsRes, songsRes, votesRes] = await Promise.all([
        supabase.from('members').select('*').eq('group_id', groupId),
        supabase
          .from('rounds')
          .select('*')
          .eq('group_id', groupId)
          .order('number', { ascending: false }),
        supabase.from('songs').select('*'),
        supabase.from('votes').select('*'),
      ]);

      if (membersRes.error) throw new Error(`Failed to fetch members: ${membersRes.error.message}`);
      if (roundsRes.error) throw new Error(`Failed to fetch rounds: ${roundsRes.error.message}`);
      if (songsRes.error) throw new Error(`Failed to fetch songs: ${songsRes.error.message}`);
      if (votesRes.error) throw new Error(`Failed to fetch votes: ${votesRes.error.message}`);

      const allMembers = (membersRes.data ?? []) as Member[];
      const allRounds = (roundsRes.data ?? []) as Round[];
      const allSongs = (songsRes.data ?? []) as Song[];
      const allVotes = (votesRes.data ?? []) as Vote[];

      // Filter songs to only those in rounds belonging to this group
      const roundIds = new Set(allRounds.map((r) => r.id));
      const groupSongs = allSongs.filter((s) => roundIds.has(s.round_id));
      const groupSongIds = new Set(groupSongs.map((s) => s.id));
      const groupVotes = allVotes.filter((v) => groupSongIds.has(v.song_id));

      // Determine current round (most recent by number)
      const currentRound = allRounds.length > 0 ? allRounds[0] : null;

      // Build per-member stats
      const roundWins = new Map<string, number>();

      // Count round wins from all past rounds (not current)
      const pastRoundData: PastRound[] = [];

      for (const round of allRounds) {
        const isCurrentRound = currentRound && round.id === currentRound.id;
        const roundSongs = groupSongs.filter((s) => s.round_id === round.id);
        const winner = findRoundWinner(roundSongs, groupVotes, allMembers);

        if (winner) {
          // Count win for the member (across all rounds for stats)
          if (!isCurrentRound) {
            roundWins.set(winner.winnerId, (roundWins.get(winner.winnerId) ?? 0) + 1);
          }

          // Build past round summary (exclude current)
          if (!isCurrentRound) {
            const winnerMember = allMembers.find((m) => m.id === winner.winnerId);
            pastRoundData.push({
              number: round.number,
              winner: winnerMember?.name ?? '?',
              topSong: winner.topSong.title,
              topArtist: winner.topSong.artist,
              topScore: winner.topScore,
            });
          }
        }
      }

      // Compute member stats
      const memberStats: MemberStats[] = allMembers.map((member) => {
        const memberSongs = groupSongs.filter((s) => s.member_id === member.id);
        const songsAdded = memberSongs.length;

        // Total score = sum of all individual ratings received
        let totalRatingsSum = 0;
        let totalRatingsCount = 0;

        for (const song of memberSongs) {
          const songVotes = groupVotes.filter((v) => v.song_id === song.id);
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

      // Sort by totalScore descending
      memberStats.sort((a, b) => b.totalScore - a.totalScore);

      if (!mountedRef.current) return;
      setMembers(memberStats);
      setPastRounds(pastRoundData);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(message);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { members, pastRounds, isLoading, error };
}
