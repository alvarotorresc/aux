// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMember } from '../useMember';
import type { Member } from '../../lib/types';

// --- Mocks at boundaries ---

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn((_table: string) => ({ select: mockSelect }));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('../../lib/storage', () => ({
  getMemberId: vi.fn(),
}));

import { getMemberId } from '../../lib/storage';

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: VALID_UUID,
    group_id: 'group-1',
    name: 'Alice',
    avatar: '🎵',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('useMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null member when no member ID is stored', async () => {
    vi.mocked(getMemberId).mockReturnValue(null);

    const { result } = renderHook(() => useMember('test-group'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.member).toBeNull();
  });

  it('should fetch and return member when valid ID is stored', async () => {
    const member = makeMember();
    vi.mocked(getMemberId).mockReturnValue(VALID_UUID);
    mockEq.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: member, error: null }),
    });

    const { result } = renderHook(() => useMember('test-group'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.member).toEqual(member);
  });

  it('should return null member when supabase returns error', async () => {
    vi.mocked(getMemberId).mockReturnValue(VALID_UUID);
    mockEq.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'not found' },
      }),
    });

    const { result } = renderHook(() => useMember('test-group'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.member).toBeNull();
  });

  it('should return null member when supabase returns null data', async () => {
    vi.mocked(getMemberId).mockReturnValue(VALID_UUID);
    mockEq.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useMember('test-group'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.member).toBeNull();
  });

  it('should call getMemberId with the slug', async () => {
    vi.mocked(getMemberId).mockReturnValue(null);

    renderHook(() => useMember('my-cool-group'));

    await waitFor(() => {
      expect(getMemberId).toHaveBeenCalledWith('my-cool-group');
    });
  });

  it('should query supabase members table with the stored ID', async () => {
    vi.mocked(getMemberId).mockReturnValue(VALID_UUID);
    mockEq.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: makeMember(), error: null }),
    });

    renderHook(() => useMember('test-group'));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('members');
    });
  });
});
