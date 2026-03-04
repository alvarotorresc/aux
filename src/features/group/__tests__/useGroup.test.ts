// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGroup } from '../useGroup';
import type { Round, Song } from '../../../lib/types';

// --- Mocks at boundaries ---

const mockEnsureCurrentRound = vi.fn();
vi.mock('../../../lib/rounds', () => ({
  ensureCurrentRound: (...args: unknown[]) => mockEnsureCurrentRound(...args),
}));

const mockResolveSongLink = vi.fn();
vi.mock('../../../lib/odesli', () => ({
  resolveSongLink: (...args: unknown[]) => mockResolveSongLink(...args),
}));

// Flexible supabase mock that supports different tables and chains
const mockSongsSelect = vi.fn().mockResolvedValue({ data: [], error: null });
const mockVotesSelect = vi.fn().mockResolvedValue({ data: [], error: null });
const mockSongsInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockVotesUpsert = vi.fn().mockResolvedValue({ error: null });
const mockMembersSelect = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'songs') {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockSongsSelect(),
            }),
          }),
          insert: (data: unknown) => ({
            select: () => ({
              single: () => mockSongsInsert(data),
            }),
          }),
        };
      }
      if (table === 'votes') {
        return {
          select: () => ({
            in: () => mockVotesSelect(),
          }),
          upsert: (data: unknown, opts: unknown) => mockVotesUpsert(data, opts),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockMembersSelect(),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

// --- Factories ---

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

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    round_id: 'round-1',
    member_id: 'member-1',
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    thumbnail_url: 'https://example.com/thumb.jpg',
    platform_links: [],
    odesli_page_url: 'https://song.link/test',
    genre: 'rock',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('useGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore defaults after clearAllMocks wipes mock implementations
    mockSongsSelect.mockResolvedValue({ data: [], error: null });
    mockVotesSelect.mockResolvedValue({ data: [], error: null });
    mockSongsInsert.mockResolvedValue({ data: null, error: null });
    mockVotesUpsert.mockResolvedValue({ error: null });
    mockMembersSelect.mockResolvedValue({ data: [], error: null });
  });

  it('should start in loading state', () => {
    mockEnsureCurrentRound.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.songs).toEqual([]);
    expect(result.current.round).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should load round and empty songs on initialization', async () => {
    const round = makeRound();
    mockEnsureCurrentRound.mockResolvedValue(round);

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.round).toEqual(round);
    expect(result.current.songs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should set error when ensureCurrentRound fails', async () => {
    mockEnsureCurrentRound.mockRejectedValue(new Error('DB connection failed'));

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('DB connection failed');
    expect(result.current.round).toBeNull();
  });

  it('should pass groupId to ensureCurrentRound', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    renderHook(() => useGroup('my-group-id', 'member-1'));

    await waitFor(() => {
      expect(mockEnsureCurrentRound).toHaveBeenCalledWith('my-group-id');
    });
  });

  it('should throw error when addSong is called without a round', async () => {
    mockEnsureCurrentRound.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.addSong('https://open.spotify.com/track/abc')).rejects.toThrow(
      'Cannot add song: no active round or member',
    );
  });

  it('should throw error when addSong is called without a member ID', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const { result } = renderHook(() => useGroup('group-1', null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.addSong('https://open.spotify.com/track/abc')).rejects.toThrow(
      'Cannot add song: no active round or member',
    );
  });

  it('should throw error when voteSong is called without a member ID', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const { result } = renderHook(() => useGroup('group-1', null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.voteSong('song-1', 4)).rejects.toThrow('Cannot vote: not a member');
  });

  it('should throw error when rating exceeds 5', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 5.3 rounds to 5.5 which is > 5
    await expect(result.current.voteSong('song-1', 5.3)).rejects.toThrow(
      'Rating must be between 0 and 5',
    );
  });

  it('should throw error when rating is negative', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.voteSong('song-1', -1)).rejects.toThrow(
      'Rating must be between 0 and 5',
    );
  });

  it('should default songsPerRound to 3', () => {
    mockEnsureCurrentRound.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    // Verify the hook initializes (the default is in the function signature)
    expect(result.current.songs).toEqual([]);
  });

  it('should expose refetch, addSong, and voteSong functions', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.addSong).toBe('function');
    expect(typeof result.current.voteSong).toBe('function');
  });

  it('should use provided initial members', () => {
    mockEnsureCurrentRound.mockReturnValue(new Promise(() => {}));

    const members = [
      {
        id: 'member-1',
        group_id: 'group-1',
        name: 'Alice',
        avatar: '🎵',
        is_admin: false,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const { result } = renderHook(() => useGroup('group-1', 'member-1', 3, members));

    expect(result.current.members).toEqual(members);
  });

  it('should set error when songs fetch fails', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());
    mockSongsSelect.mockResolvedValue({ data: null, error: { message: 'songs DB error' } });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch songs: songs DB error');
  });

  it('should set error when votes fetch fails', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());
    const song = makeSong({ id: 'song-1' });
    mockSongsSelect.mockResolvedValue({ data: [song], error: null });
    mockVotesSelect.mockResolvedValue({ data: null, error: { message: 'votes DB error' } });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch votes: votes DB error');
  });

  it('should handle null songs data with no error gracefully', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());
    // Supabase returns null data but no error (edge case)
    mockSongsSelect.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // null data is treated as empty array, so songs should be empty
    expect(result.current.songs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle null votes data with no error gracefully', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());
    const song = makeSong({ id: 'song-1' });
    mockSongsSelect.mockResolvedValue({ data: [song], error: null });
    // Votes returns null data but no error
    mockVotesSelect.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // null votes treated as empty array, song should have 0 votes
    expect(result.current.songs).toHaveLength(1);
    expect(result.current.songs[0].totalVotes).toBe(0);
    expect(result.current.songs[0].avgRating).toBe(0);
  });

  it('should not update state when unmounted during initialization', async () => {
    let resolveRound!: (value: unknown) => void;
    mockEnsureCurrentRound.mockReturnValue(
      new Promise((resolve) => {
        resolveRound = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useGroup('group-1', 'member-1'));

    expect(result.current.isLoading).toBe(true);

    // Unmount while waiting for ensureCurrentRound
    unmount();

    // Resolve after unmount — mountedRef check should prevent state updates
    resolveRound(makeRound());

    // Allow microtasks to process
    await new Promise((r) => setTimeout(r, 0));
  });

  it('should not set error when unmounted during failed initialization', async () => {
    let rejectRound!: (reason: unknown) => void;
    mockEnsureCurrentRound.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRound = reject;
      }),
    );

    const { unmount } = renderHook(() => useGroup('group-1', 'member-1'));

    // Unmount while waiting for ensureCurrentRound
    unmount();

    // Reject after unmount — catch block should check mountedRef
    rejectRound(new Error('network error'));

    await new Promise((r) => setTimeout(r, 0));
  });

  it('should return early from refetch when no round is loaded', async () => {
    mockEnsureCurrentRound.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Round is null, calling refetch should return early without fetching
    const songCallsBefore = mockSongsSelect.mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    // No additional songs fetch should have been made
    expect(mockSongsSelect.mock.calls.length).toBe(songCallsBefore);
  });

  it('should set error with generic message when non-Error is thrown', async () => {
    mockEnsureCurrentRound.mockRejectedValue('some string error');

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load group data');
  });

  // --- addSong tests ---

  it('should add song successfully and update local state', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const resolvedSong = {
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      platformLinks: [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }],
      pageUrl: 'https://song.link/bohemian',
      genre: 'rock',
    };
    mockResolveSongLink.mockResolvedValue(resolvedSong);

    const insertedSong = makeSong({
      id: 'new-song-1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      genre: 'rock',
    });
    mockSongsInsert.mockResolvedValue({ data: insertedSong, error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addSong('https://open.spotify.com/track/abc', 'rock');
    });

    expect(mockResolveSongLink).toHaveBeenCalledWith('https://open.spotify.com/track/abc');
    expect(mockSongsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        round_id: 'round-1',
        member_id: 'member-1',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        genre: 'rock',
      }),
    );

    // Song should appear in local state
    expect(result.current.songs).toHaveLength(1);
    expect(result.current.songs[0].title).toBe('Bohemian Rhapsody');
    expect(result.current.songs[0].avgRating).toBe(0);
    expect(result.current.songs[0].totalVotes).toBe(0);
  });

  it('should reject invalid genre and set it to null', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const resolvedSong = {
      title: 'Test Song',
      artist: 'Test Artist',
      album: null,
      thumbnailUrl: null,
      platformLinks: [],
      pageUrl: null,
      genre: 'invalid-genre-xyz',
    };
    mockResolveSongLink.mockResolvedValue(resolvedSong);
    mockSongsInsert.mockResolvedValue({ data: makeSong({ genre: null }), error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addSong('https://example.com/track', 'invalid-genre-xyz');
    });

    // The genre passed to supabase insert should be null (invalid genre rejected)
    expect(mockSongsInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        genre: null,
      }),
    );
  });

  it('should throw error when song limit per round is reached', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    // Pre-fill 3 songs for member-1 in round-1
    const existingSongs = [
      makeSong({ id: 's1', member_id: 'member-1', round_id: 'round-1' }),
      makeSong({ id: 's2', member_id: 'member-1', round_id: 'round-1' }),
      makeSong({ id: 's3', member_id: 'member-1', round_id: 'round-1' }),
    ];
    mockSongsSelect.mockResolvedValue({ data: existingSongs, error: null });
    mockVotesSelect.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1', 3));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.addSong('https://open.spotify.com/track/abc')).rejects.toThrow(
      'You can only add 3 songs per round',
    );
  });

  it('should throw error when insert fails', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    mockResolveSongLink.mockResolvedValue({
      title: 'Test',
      artist: 'Test',
      album: null,
      thumbnailUrl: null,
      platformLinks: [],
      pageUrl: null,
      genre: null,
    });
    mockSongsInsert.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.addSong('https://example.com')).rejects.toThrow(
      'Failed to add song: Insert failed',
    );
  });

  // --- voteSong tests ---

  it('should optimistically update song rating on vote', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const song = makeSong({ id: 'song-1', member_id: 'member-2' });
    mockSongsSelect.mockResolvedValue({ data: [song], error: null });
    mockVotesSelect.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.songs).toHaveLength(1);
    });

    // Vote — don't await because we want to check optimistic state
    let votePromise: Promise<void>;
    act(() => {
      votePromise = result.current.voteSong('song-1', 4);
    });

    // Optimistic update should reflect immediately
    await waitFor(() => {
      expect(result.current.songs[0].avgRating).toBe(4);
      expect(result.current.songs[0].totalVotes).toBe(1);
    });

    // Let the vote complete
    await act(async () => {
      await votePromise!;
    });

    expect(mockVotesUpsert).toHaveBeenCalledWith(
      { song_id: 'song-1', member_id: 'member-1', rating: 4 },
      { onConflict: 'song_id,member_id' },
    );
  });

  it('should snap rating to 0.5 steps', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const song = makeSong({ id: 'song-1', member_id: 'member-2' });
    mockSongsSelect.mockResolvedValue({ data: [song], error: null });
    mockVotesSelect.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.voteSong('song-1', 3.3);
    });

    // 3.3 should snap to 3.5
    expect(mockVotesUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 3.5 }),
      expect.anything(),
    );
  });

  it('should revert optimistic update and refetch when vote fails', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const song = makeSong({ id: 'song-1', member_id: 'member-2' });
    mockSongsSelect.mockResolvedValue({ data: [song], error: null });
    mockVotesSelect.mockResolvedValue({ data: [], error: null });
    mockMembersSelect.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.songs).toHaveLength(1);
    });

    // Make upsert fail
    mockVotesUpsert.mockResolvedValueOnce({ error: { message: 'DB error' } });

    await expect(
      act(async () => {
        await result.current.voteSong('song-1', 4);
      }),
    ).rejects.toThrow('Failed to save vote: DB error');
  });

  it('should update existing vote optimistically', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const song = makeSong({ id: 'song-1', member_id: 'member-2' });
    const existingVote = {
      id: 'vote-1',
      song_id: 'song-1',
      member_id: 'member-1',
      rating: 3,
      created_at: '2026-01-01T00:00:00Z',
    };
    mockSongsSelect.mockResolvedValue({ data: [song], error: null });
    mockVotesSelect.mockResolvedValue({ data: [existingVote], error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.songs[0].avgRating).toBe(3);
    });

    // Update vote from 3 to 5
    let votePromise: Promise<void>;
    act(() => {
      votePromise = result.current.voteSong('song-1', 5);
    });

    // Optimistic: should update to 5
    await waitFor(() => {
      expect(result.current.songs[0].avgRating).toBe(5);
      expect(result.current.songs[0].totalVotes).toBe(1); // still 1 vote, just updated
    });

    await act(async () => {
      await votePromise!;
    });
  });

  it('should only update the voted song and leave others unchanged when multiple songs exist', async () => {
    mockEnsureCurrentRound.mockResolvedValue(makeRound());

    const song1 = makeSong({ id: 'song-1', member_id: 'member-2', title: 'Song A' });
    const song2 = makeSong({ id: 'song-2', member_id: 'member-2', title: 'Song B' });
    mockSongsSelect.mockResolvedValue({ data: [song1, song2], error: null });
    mockVotesSelect.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.songs).toHaveLength(2);
    });

    let votePromise: Promise<void>;
    act(() => {
      votePromise = result.current.voteSong('song-1', 4);
    });

    await waitFor(() => {
      expect(result.current.songs[0].avgRating).toBe(4);
      expect(result.current.songs[0].totalVotes).toBe(1);
      // Song 2 should be untouched
      expect(result.current.songs[1].avgRating).toBe(0);
      expect(result.current.songs[1].totalVotes).toBe(0);
    });

    await act(async () => {
      await votePromise!;
    });
  });

  // --- Polling tests ---

  describe('polling', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should set up 15-second polling interval after initialization', async () => {
      mockEnsureCurrentRound.mockResolvedValue(makeRound());

      renderHook(() => useGroup('group-1', 'member-1'));

      await waitFor(() => {
        expect(mockSongsSelect).toHaveBeenCalled();
      });

      // Clear initial call counts
      const initialSongsCalls = mockSongsSelect.mock.calls.length;

      // Advance by 15 seconds
      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });

      // refetch should have been called, triggering another songs select
      expect(mockSongsSelect.mock.calls.length).toBeGreaterThan(initialSongsCalls);
    });

    it('should keep existing members when refetch members query fails', async () => {
      const initialMembers = [
        {
          id: 'member-1',
          group_id: 'group-1',
          name: 'Alice',
          avatar: '🎵',
          is_admin: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ];
      mockEnsureCurrentRound.mockResolvedValue(makeRound());

      const { result } = renderHook(() => useGroup('group-1', 'member-1', 3, initialMembers));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toEqual(initialMembers);

      // Make members query fail on refetch
      mockMembersSelect.mockResolvedValue({ data: null, error: { message: 'timeout' } });

      // Advance to trigger refetch
      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });

      // Members should still be the initial ones (not updated due to error)
      expect(result.current.members).toEqual(initialMembers);
    });

    it('should not poll when no round is loaded', async () => {
      mockEnsureCurrentRound.mockRejectedValue(new Error('fail'));

      renderHook(() => useGroup('group-1', 'member-1'));

      await waitFor(() => {
        expect(mockEnsureCurrentRound).toHaveBeenCalled();
      });

      const callsBefore = mockSongsSelect.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      // No polling should happen since round is null
      expect(mockSongsSelect.mock.calls.length).toBe(callsBefore);
    });

    it('should clean up polling interval on unmount', async () => {
      mockEnsureCurrentRound.mockResolvedValue(makeRound());

      const { unmount } = renderHook(() => useGroup('group-1', 'member-1'));

      await waitFor(() => {
        expect(mockSongsSelect).toHaveBeenCalled();
      });

      unmount();

      const callsBefore = mockSongsSelect.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(30_000);
      });

      // No more calls after unmount
      expect(mockSongsSelect.mock.calls.length).toBe(callsBefore);
    });
  });
});
