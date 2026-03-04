// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useWrapped } from '../useWrapped';
import type { Member, Round, Song, Vote } from '../../../lib/types';

// --- Configurable supabase mock ---

let mockData: {
  members: { data: Member[] | null; error: unknown };
  rounds: { data: Round[] | null; error: unknown };
  songs: { data: Song[] | null; error: unknown };
  votes: { data: Vote[] | null; error: unknown };
};

// Optional override to return a custom promise for a table (for async unmount tests)
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

describe('useWrapped', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockData();
  });

  it('should start in loading state', () => {
    const { result } = renderHook(() => useWrapped('group-1'));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.availablePeriods).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return stats for default period after fetch', async () => {
    const alice = makeMember({ id: 'm1', name: 'Alice' });
    const round = makeRound({ id: 'r1', starts_at: '2026-01-15T00:00:00Z' });
    const song = makeSong({ id: 's1', round_id: 'r1', member_id: 'm1' });
    const vote = makeVote({ id: 'v1', song_id: 's1', member_id: 'm2', rating: 4 });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [round], error: null };
    mockData.songs = { data: [song], error: null };
    mockData.votes = { data: [vote], error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).not.toBeNull();
    expect(result.current.stats!.totalSongs).toBe(1);
    expect(result.current.stats!.totalVotes).toBe(1);
    expect(result.current.selectedPeriod).not.toBeNull();
  });

  it('should return available periods', async () => {
    const r1 = makeRound({ id: 'r1', starts_at: '2026-01-15T00:00:00Z' });
    const r2 = makeRound({ id: 'r2', starts_at: '2026-04-15T00:00:00Z' });

    mockData.members = { data: [], error: null };
    mockData.rounds = { data: [r2, r1], error: null };
    mockData.songs = { data: [], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Q2 2026, Q1 2026, 2026
    expect(result.current.availablePeriods).toHaveLength(3);
  });

  it('should change period without re-fetching', async () => {
    const alice = makeMember({ id: 'm1', name: 'Alice' });
    const r1 = makeRound({ id: 'r1', number: 1, starts_at: '2026-01-15T00:00:00Z' });
    const r2 = makeRound({ id: 'r2', number: 2, starts_at: '2026-04-15T00:00:00Z' });
    const s1 = makeSong({ id: 's1', round_id: 'r1', member_id: 'm1' });
    const s2 = makeSong({ id: 's2', round_id: 'r2', member_id: 'm1' });

    mockData.members = { data: [alice], error: null };
    mockData.rounds = { data: [r2, r1], error: null };
    mockData.songs = { data: [s1, s2], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Default is most recent (Q2 2026)
    expect(result.current.stats!.totalSongs).toBe(1);

    // Switch to Q1 2026
    act(() => {
      result.current.setSelectedPeriod({ type: 'quarterly', year: 2026, quarter: 1 });
    });

    expect(result.current.stats!.totalSongs).toBe(1);
    expect(result.current.stats!.period).toEqual({ type: 'quarterly', year: 2026, quarter: 1 });
  });

  it('should handle errors', async () => {
    mockData.members = { data: null, error: { message: 'connection refused' } };
    mockData.rounds = { data: [], error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch members');
  });

  it('should handle no rounds gracefully', async () => {
    mockData.members = { data: [makeMember()], error: null };
    mockData.rounds = { data: [], error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.availablePeriods).toEqual([]);
    expect(result.current.selectedPeriod).toBeNull();
    expect(result.current.stats).toBeNull();
  });

  it('should default to the most recent period', async () => {
    const r1 = makeRound({ id: 'r1', starts_at: '2025-07-15T00:00:00Z' });
    const r2 = makeRound({ id: 'r2', starts_at: '2026-01-15T00:00:00Z' });

    mockData.members = { data: [], error: null };
    mockData.rounds = { data: [r2, r1], error: null };
    mockData.songs = { data: [], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Most recent should be Q1 2026
    expect(result.current.selectedPeriod).toEqual({ type: 'quarterly', year: 2026, quarter: 1 });
  });

  it('should handle rounds fetch error', async () => {
    mockData.members = { data: [], error: null };
    mockData.rounds = { data: null, error: { message: 'timeout' } };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch rounds');
  });

  it('should handle songs fetch error', async () => {
    const r1 = makeRound({ id: 'r1' });
    mockData.members = { data: [], error: null };
    mockData.rounds = { data: [r1], error: null };
    mockData.songs = { data: null, error: { message: 'timeout' } };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch songs');
  });

  it('should set error when votes fetch fails', async () => {
    const r1 = makeRound({ id: 'r1' });
    const s1 = makeSong({ id: 's1', round_id: 'r1' });

    mockData.members = { data: [makeMember()], error: null };
    mockData.rounds = { data: [r1], error: null };
    mockData.songs = { data: [s1], error: null };
    mockData.votes = { data: null, error: { message: 'votes timeout' } };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Failed to fetch votes');
  });

  it('should set generic error message when non-Error is thrown', async () => {
    // Make the supabase mock throw a non-Error value
    // Override members to return a thenable that rejects with a string
    mockData.members = {
      data: null,
      error: null,
    };
    // Hijack the mock to throw a string instead of an Error
    const originalMembers = mockData.members;
    Object.defineProperty(mockData, 'members', {
      get: () => {
        // Restore it after first access to prevent infinite loops
        Object.defineProperty(mockData, 'members', {
          value: originalMembers,
          writable: true,
          configurable: true,
        });
        throw 'string error, not an Error instance';
      },
      configurable: true,
    });

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load wrapped data');
  });

  it('should not override selectedPeriod when it is already set on re-fetch', async () => {
    const r1 = makeRound({ id: 'r1', number: 1, starts_at: '2026-01-15T00:00:00Z' });
    const r2 = makeRound({ id: 'r2', number: 2, starts_at: '2026-04-15T00:00:00Z' });

    mockData.members = { data: [], error: null };
    mockData.rounds = { data: [r2, r1], error: null };
    mockData.songs = { data: [], error: null };
    mockData.votes = { data: [], error: null };

    const { result, rerender } = renderHook(({ groupId }) => useWrapped(groupId), {
      initialProps: { groupId: 'group-1' },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Default period was auto-selected (most recent: Q2 2026)
    expect(result.current.selectedPeriod).toEqual({ type: 'quarterly', year: 2026, quarter: 2 });

    // User manually selects Q1 2026
    act(() => {
      result.current.setSelectedPeriod({ type: 'quarterly', year: 2026, quarter: 1 });
    });

    expect(result.current.selectedPeriod).toEqual({ type: 'quarterly', year: 2026, quarter: 1 });

    // Trigger a re-fetch by changing groupId
    rerender({ groupId: 'group-2' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // selectedPeriod should NOT be overridden by the default (prev ?? periods[0])
    // It should retain the user's manual selection
    expect(result.current.selectedPeriod).toEqual({ type: 'quarterly', year: 2026, quarter: 1 });
  });

  it('should skip votes fetch when no songs exist', async () => {
    const r1 = makeRound({ id: 'r1' });
    mockData.members = { data: [makeMember()], error: null };
    mockData.rounds = { data: [r1], error: null };
    mockData.songs = { data: [], error: null };
    mockData.votes = { data: [], error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.stats).not.toBeNull();
  });

  it('should handle null data with no error gracefully (defensive null coalescing)', async () => {
    const round = makeRound({ id: 'r1' });

    mockData.members = { data: null, error: null };
    mockData.rounds = { data: [round], error: null };
    mockData.songs = { data: null, error: null };
    mockData.votes = { data: null, error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it('should handle null rounds data gracefully', async () => {
    mockData.members = { data: [], error: null };
    mockData.rounds = { data: null, error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.availablePeriods).toEqual([]);
    expect(result.current.stats).toBeNull();
  });

  it('should handle null votes data gracefully when songs exist', async () => {
    const r1 = makeRound({ id: 'r1' });
    const s1 = makeSong({ id: 's1', round_id: 'r1' });

    mockData.members = { data: [makeMember()], error: null };
    mockData.rounds = { data: [r1], error: null };
    mockData.songs = { data: [s1], error: null };
    mockData.votes = { data: null, error: null };

    const { result } = renderHook(() => useWrapped('group-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.stats).not.toBeNull();
  });

  it('should not update state when unmounted during fetch', async () => {
    let resolveMembers!: (value: unknown) => void;
    mockOverrides.members = () =>
      new Promise((resolve) => {
        resolveMembers = resolve;
      });
    mockData.rounds = { data: [], error: null };

    const { result, unmount } = renderHook(() => useWrapped('group-1'));

    // Wait for microtask to set up the deferred promise
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isLoading).toBe(true);

    // Unmount while the fetch is still pending
    unmount();

    // Resolve after unmount — should not throw or update state
    await act(async () => {
      resolveMembers({ data: [makeMember()], error: null });
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

    const { result, unmount } = renderHook(() => useWrapped('group-1'));

    // Wait for microtask to set up the deferred promise
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isLoading).toBe(true);

    unmount();

    // Reject after unmount — catch block runs but mountedRef prevents state update
    await act(async () => {
      rejectMembers(new Error('network error'));
      await new Promise((r) => setTimeout(r, 0));
    });
  });
});
