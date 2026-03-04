import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import type { Round } from '../types';

// --- Chainable Supabase mock builder ---

type SupabaseResult<T = unknown> = {
  data: T | null;
  error: { message: string; code?: string } | null;
};

function createQueryBuilder(result: SupabaseResult) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'insert', 'eq', 'order', 'limit', 'maybeSingle', 'single'];

  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods resolve to the result
  builder.maybeSingle = vi.fn().mockReturnValue(result);
  builder.single = vi.fn().mockReturnValue(result);

  return builder;
}

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('../supabase', () => ({
  supabase: { from: mockFrom },
}));

import { getCurrentWeekBounds, ensureCurrentRound } from '../rounds';

// --- Factories ---

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    id: 'round-1',
    group_id: 'group-1',
    number: 1,
    starts_at: '2026-02-23T00:00:00.000Z',
    ends_at: '2026-03-01T23:59:59.999Z',
    created_at: '2026-02-23T00:00:01.000Z',
    ...overrides,
  };
}

// --- getCurrentWeekBounds ---

describe('getCurrentWeekBounds', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Monday 00:00 UTC to Sunday 23:59:59.999 UTC', () => {
    vi.setSystemTime(new Date('2026-02-25T14:30:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });

  it('handles Monday correctly (start of week)', () => {
    vi.setSystemTime(new Date('2026-02-23T00:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });

  it('handles Sunday correctly (end of week)', () => {
    vi.setSystemTime(new Date('2026-03-01T23:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });

  it('handles month boundary correctly', () => {
    vi.setSystemTime(new Date('2026-01-31T12:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-01-26T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-02-01T23:59:59.999Z');
  });

  it('handles year boundary correctly', () => {
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2025-12-29T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-01-04T23:59:59.999Z');
  });

  it('start is always before end', () => {
    vi.setSystemTime(new Date('2026-06-15T08:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it('week span is exactly 7 days minus 1 millisecond', () => {
    vi.setSystemTime(new Date('2026-02-25T14:30:00Z'));

    const { start, end } = getCurrentWeekBounds();
    const diffMs = end.getTime() - start.getTime();
    const sevenDaysMinusOneMs = 7 * 24 * 60 * 60 * 1000 - 1;

    expect(diffMs).toBe(sevenDaysMinusOneMs);
  });

  it('handles Saturday correctly', () => {
    vi.setSystemTime(new Date('2026-02-28T18:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });

  it('handles Tuesday correctly', () => {
    vi.setSystemTime(new Date('2026-02-24T09:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });
});

// --- ensureCurrentRound ---

describe('ensureCurrentRound', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-02-25T14:30:00Z'));
    mockFrom.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return existing round when one is found', async () => {
    const existingRound = makeRound();
    const selectBuilder = createQueryBuilder({ data: existingRound, error: null });
    mockFrom.mockReturnValue(selectBuilder);

    const result = await ensureCurrentRound('group-1');

    expect(result).toEqual(existingRound);
    expect(mockFrom).toHaveBeenCalledWith('rounds');
  });

  it('should create a new round when none exists and no previous rounds', async () => {
    const createdRound = makeRound();

    const selectBuilder = createQueryBuilder({ data: null, error: null });
    const maxBuilder = createQueryBuilder({ data: null, error: null });
    const insertBuilder = createQueryBuilder({ data: createdRound, error: null });
    insertBuilder.single = vi.fn().mockReturnValue({ data: createdRound, error: null });

    mockFrom
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(maxBuilder)
      .mockReturnValueOnce(insertBuilder);

    const result = await ensureCurrentRound('group-1');

    expect(result).toEqual(createdRound);
  });

  it('should create round with next number when previous rounds exist', async () => {
    const createdRound = makeRound({ number: 4 });

    const selectBuilder = createQueryBuilder({ data: null, error: null });
    const maxBuilder = createQueryBuilder({ data: { number: 3 }, error: null });
    const insertBuilder = createQueryBuilder({ data: createdRound, error: null });
    insertBuilder.single = vi.fn().mockReturnValue({ data: createdRound, error: null });

    mockFrom
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(maxBuilder)
      .mockReturnValueOnce(insertBuilder);

    const result = await ensureCurrentRound('group-1');

    expect(result.number).toBe(4);
  });

  it('should throw when initial select query fails', async () => {
    const selectBuilder = createQueryBuilder({
      data: null,
      error: { message: 'connection refused' },
    });
    mockFrom.mockReturnValue(selectBuilder);

    await expect(ensureCurrentRound('group-1')).rejects.toThrow(
      'Failed to query rounds: connection refused',
    );
  });

  it('should throw when max round number query fails', async () => {
    const selectBuilder = createQueryBuilder({ data: null, error: null });
    const maxBuilder = createQueryBuilder({
      data: null,
      error: { message: 'timeout' },
    });

    mockFrom.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(maxBuilder);

    await expect(ensureCurrentRound('group-1')).rejects.toThrow(
      'Failed to query max round number: timeout',
    );
  });

  it('should throw when insert fails with non-conflict error', async () => {
    const selectBuilder = createQueryBuilder({ data: null, error: null });
    const maxBuilder = createQueryBuilder({ data: null, error: null });
    const insertBuilder = createQueryBuilder({ data: null, error: null });
    insertBuilder.single = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'disk full', code: '53100' },
    });

    mockFrom
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(maxBuilder)
      .mockReturnValueOnce(insertBuilder);

    await expect(ensureCurrentRound('group-1')).rejects.toThrow(
      'Failed to create round: disk full',
    );
  });

  it('should re-fetch round on race condition (23505 conflict)', async () => {
    const reFetchedRound = makeRound({ id: 'round-other' });

    const selectBuilder = createQueryBuilder({ data: null, error: null });
    const maxBuilder = createQueryBuilder({ data: null, error: null });
    const insertBuilder = createQueryBuilder({ data: null, error: null });
    insertBuilder.single = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'duplicate key', code: '23505' },
    });
    const reFetchBuilder = createQueryBuilder({ data: reFetchedRound, error: null });

    mockFrom
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(maxBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(reFetchBuilder);

    const result = await ensureCurrentRound('group-1');

    expect(result).toEqual(reFetchedRound);
  });

  it('should throw when re-fetch after conflict also fails', async () => {
    const selectBuilder = createQueryBuilder({ data: null, error: null });
    const maxBuilder = createQueryBuilder({ data: null, error: null });
    const insertBuilder = createQueryBuilder({ data: null, error: null });
    insertBuilder.single = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'duplicate key', code: '23505' },
    });
    const reFetchBuilder = createQueryBuilder({
      data: null,
      error: { message: 're-fetch failed' },
    });

    mockFrom
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(maxBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(reFetchBuilder);

    await expect(ensureCurrentRound('group-1')).rejects.toThrow(
      'Failed to retrieve round after conflict: re-fetch failed',
    );
  });

  it('should throw when re-fetch after conflict returns null data', async () => {
    const selectBuilder = createQueryBuilder({ data: null, error: null });
    const maxBuilder = createQueryBuilder({ data: null, error: null });
    const insertBuilder = createQueryBuilder({ data: null, error: null });
    insertBuilder.single = vi.fn().mockReturnValue({
      data: null,
      error: { message: 'duplicate key', code: '23505' },
    });
    const reFetchBuilder = createQueryBuilder({ data: null, error: null });

    mockFrom
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(maxBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(reFetchBuilder);

    await expect(ensureCurrentRound('group-1')).rejects.toThrow(
      'Failed to retrieve round after conflict',
    );
  });
});
