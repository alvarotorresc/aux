import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ensureCurrentRound } from '../../lib/rounds';
import { resolveSongLink } from '../../lib/odesli';
import type { Round, Song, Vote, SongWithVotes } from '../../lib/types';

interface UseGroupResult {
  round: Round | null;
  songs: SongWithVotes[];
  isLoading: boolean;
  error: string | null;
  addSong: (url: string) => Promise<void>;
  voteSong: (songId: string, rating: number) => Promise<void>;
  refetch: () => Promise<void>;
}

/** Compute avgRating and totalVotes for a song given its votes */
function enrichSong(song: Song, votes: Vote[]): SongWithVotes {
  const songVotes = votes.filter((v) => v.song_id === song.id);
  const totalVotes = songVotes.length;
  const avgRating =
    totalVotes > 0 ? songVotes.reduce((sum, v) => sum + v.rating, 0) / totalVotes : 0;

  return { ...song, votes: songVotes, avgRating, totalVotes };
}

/**
 * Main hook for the group view. Handles:
 * - Ensuring the current round exists
 * - Fetching songs with their votes
 * - Adding songs (via Odesli resolution)
 * - Voting on songs (upsert with optimistic update)
 */
export function useGroup(
  groupId: string,
  memberId: string | null,
  songsPerRound: number = 5,
): UseGroupResult {
  const [round, setRound] = useState<Round | null>(null);
  const [songs, setSongs] = useState<SongWithVotes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if the component is still mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /** Fetch songs and votes for the given round */
  const fetchSongsForRound = useCallback(async (roundId: string): Promise<SongWithVotes[]> => {
    // Step 1: fetch songs for this round
    const { data: songsData, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .eq('round_id', roundId)
      .order('created_at', { ascending: true });

    if (songsError) {
      throw new Error(`Failed to fetch songs: ${songsError.message}`);
    }

    const fetchedSongs = (songsData ?? []) as Song[];

    if (fetchedSongs.length === 0) {
      return [];
    }

    // Step 2: fetch votes for these songs
    const songIds = fetchedSongs.map((s) => s.id);
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .in('song_id', songIds);

    if (votesError) {
      throw new Error(`Failed to fetch votes: ${votesError.message}`);
    }

    const allVotes = (votesData ?? []) as Vote[];
    return fetchedSongs.map((song) => enrichSong(song, allVotes));
  }, []);

  /** Initialize: ensure round exists, then fetch songs */
  const initialize = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const currentRound = await ensureCurrentRound(groupId);
      if (!mountedRef.current) return;
      setRound(currentRound);

      const enrichedSongs = await fetchSongsForRound(currentRound.id);
      if (!mountedRef.current) return;
      setSongs(enrichedSongs);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load group data';
      setError(message);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [groupId, fetchSongsForRound]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  /** Refetch songs for the current round */
  const refetch = useCallback(async () => {
    if (!round) return;
    try {
      const enrichedSongs = await fetchSongsForRound(round.id);
      if (mountedRef.current) {
        setSongs(enrichedSongs);
      }
    } catch {
      // Silent refetch failure — user already has data displayed
    }
  }, [round, fetchSongsForRound]);

  /** Add a new song by resolving the URL via Odesli and inserting into Supabase */
  const addSong = useCallback(
    async (url: string) => {
      if (!round || !memberId) {
        throw new Error('Cannot add song: no active round or member');
      }

      // Check song limit per round
      const mySongsThisRound = songs.filter(
        (s) => s.member_id === memberId && s.round_id === round.id,
      );
      if (mySongsThisRound.length >= songsPerRound) {
        throw new Error(`You can only add ${songsPerRound} songs per round`);
      }

      // Resolve via Odesli
      const resolved = await resolveSongLink(url);

      // Insert into Supabase
      const { data: inserted, error: insertError } = await supabase
        .from('songs')
        .insert({
          round_id: round.id,
          member_id: memberId,
          title: resolved.title,
          artist: resolved.artist,
          album: resolved.album,
          thumbnail_url: resolved.thumbnailUrl,
          spotify_url: resolved.spotifyUrl,
          youtube_url: resolved.youtubeUrl,
          odesli_page_url: resolved.pageUrl,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to add song: ${insertError.message}`);
      }

      const newSong = inserted as Song;

      // Optimistically add to local state
      if (mountedRef.current) {
        setSongs((prev) => [...prev, { ...newSong, votes: [], avgRating: 0, totalVotes: 0 }]);
      }
    },
    [round, memberId],
  );

  /** Vote on a song (upsert: updates if already voted) */
  const voteSong = useCallback(
    async (songId: string, rating: number) => {
      if (!memberId) {
        throw new Error('Cannot vote: not a member');
      }

      // Mirror the DB check constraint: rating numeric(2,1) between 0 and 5
      const roundedRating = Math.round(rating * 2) / 2; // snap to 0.5 steps
      if (roundedRating < 0 || roundedRating > 5) {
        throw new Error('Rating must be between 0 and 5');
      }

      // Optimistic update
      setSongs((prev) =>
        prev.map((song) => {
          if (song.id !== songId) return song;

          const existingVoteIndex = song.votes.findIndex((v) => v.member_id === memberId);
          let updatedVotes: Vote[];

          if (existingVoteIndex >= 0) {
            // Update existing vote
            updatedVotes = song.votes.map((v, i) =>
              i === existingVoteIndex ? { ...v, rating: roundedRating } : v,
            );
          } else {
            // Add new vote (optimistic ID)
            const optimisticVote: Vote = {
              id: `optimistic-${Date.now()}`,
              song_id: songId,
              member_id: memberId,
              rating: roundedRating,
              created_at: new Date().toISOString(),
            };
            updatedVotes = [...song.votes, optimisticVote];
          }

          const totalVotes = updatedVotes.length;
          const avgRating =
            totalVotes > 0 ? updatedVotes.reduce((sum, v) => sum + v.rating, 0) / totalVotes : 0;

          return { ...song, votes: updatedVotes, avgRating, totalVotes };
        }),
      );

      // Persist to Supabase
      const { error: upsertError } = await supabase.from('votes').upsert(
        {
          song_id: songId,
          member_id: memberId,
          rating: roundedRating,
        },
        { onConflict: 'song_id,member_id' },
      );

      if (upsertError) {
        // Revert on failure by refetching
        await refetch();
        throw new Error(`Failed to save vote: ${upsertError.message}`);
      }

      // Sync with server to get real vote IDs
      await refetch();
    },
    [memberId, refetch],
  );

  return { round, songs, isLoading, error, addSong, voteSong, refetch };
}
