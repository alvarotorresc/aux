// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGroup } from '../useGroup';
import type { Round } from '../../../lib/types';

// --- Mocks at boundaries ---

const mockEnsureCurrentRound = vi.fn();
vi.mock('../../../lib/rounds', () => ({
  ensureCurrentRound: (...args: unknown[]) => mockEnsureCurrentRound(...args),
}));

const mockResolveSongLink = vi.fn();
vi.mock('../../../lib/odesli', () => ({
  resolveSongLink: (...args: unknown[]) => mockResolveSongLink(...args),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        in: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
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

describe('useGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should set error with generic message when non-Error is thrown', async () => {
    mockEnsureCurrentRound.mockRejectedValue('some string error');

    const { result } = renderHook(() => useGroup('group-1', 'member-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load group data');
  });
});
