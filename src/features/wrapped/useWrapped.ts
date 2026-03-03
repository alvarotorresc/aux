import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import type { Member, Round, Song, Vote } from '../../lib/types';
import {
  computeWrappedStats,
  getAvailablePeriods,
  type WrappedPeriod,
  type WrappedStats,
} from '../../lib/wrapped';

export interface UseWrappedResult {
  stats: WrappedStats | null;
  availablePeriods: WrappedPeriod[];
  selectedPeriod: WrappedPeriod | null;
  setSelectedPeriod: (period: WrappedPeriod) => void;
  isLoading: boolean;
  error: string | null;
}

export function useWrapped(groupId: string): UseWrappedResult {
  const [members, setMembers] = useState<Member[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<WrappedPeriod | null>(null);
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
      const [membersRes, roundsRes] = await Promise.all([
        supabase.from('members').select('*').eq('group_id', groupId),
        supabase
          .from('rounds')
          .select('*')
          .eq('group_id', groupId)
          .order('number', { ascending: false }),
      ]);

      if (membersRes.error) throw new Error(`Failed to fetch members: ${membersRes.error.message}`);
      if (roundsRes.error) throw new Error(`Failed to fetch rounds: ${roundsRes.error.message}`);

      const allMembers = (membersRes.data ?? []) as Member[];
      const allRounds = (roundsRes.data ?? []) as Round[];
      const roundIds = allRounds.map((r) => r.id);

      if (roundIds.length === 0) {
        if (!mountedRef.current) return;
        setMembers(allMembers);
        setRounds([]);
        setSongs([]);
        setVotes([]);
        return;
      }

      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('*')
        .in('round_id', roundIds);

      if (songsError) throw new Error(`Failed to fetch songs: ${songsError.message}`);

      const allSongs = (songsData ?? []) as Song[];
      const songIds = allSongs.map((s) => s.id);

      let allVotes: Vote[] = [];
      if (songIds.length > 0) {
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .in('song_id', songIds);

        if (votesError) throw new Error(`Failed to fetch votes: ${votesError.message}`);
        allVotes = (votesData ?? []) as Vote[];
      }

      if (!mountedRef.current) return;
      setMembers(allMembers);
      setRounds(allRounds);
      setSongs(allSongs);
      setVotes(allVotes);

      // Default to most recent period
      const periods = getAvailablePeriods(allRounds);
      if (periods.length > 0) {
        setSelectedPeriod((prev) => prev ?? periods[0]);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load wrapped data';
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

  const availablePeriods = useMemo(() => getAvailablePeriods(rounds), [rounds]);

  const stats = useMemo(() => {
    if (!selectedPeriod) return null;
    return computeWrappedStats(selectedPeriod, rounds, songs, votes, members);
  }, [selectedPeriod, rounds, songs, votes, members]);

  return { stats, availablePeriods, selectedPeriod, setSelectedPeriod, isLoading, error };
}
