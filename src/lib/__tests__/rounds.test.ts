import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../supabase', () => ({
  supabase: {},
}));

import { getCurrentWeekBounds } from '../rounds';

describe('getCurrentWeekBounds', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Monday 00:00 UTC to Sunday 23:59:59.999 UTC', () => {
    // Wednesday 2026-02-25 14:30:00 UTC
    vi.setSystemTime(new Date('2026-02-25T14:30:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z'); // Monday
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z'); // Sunday
  });

  it('handles Monday correctly (start of week)', () => {
    // Monday 2026-02-23 00:00:00 UTC
    vi.setSystemTime(new Date('2026-02-23T00:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });

  it('handles Sunday correctly (end of week)', () => {
    // Sunday 2026-03-01 23:00:00 UTC
    vi.setSystemTime(new Date('2026-03-01T23:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-02-23T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-01T23:59:59.999Z');
  });

  it('handles month boundary correctly', () => {
    // Saturday 2026-01-31 12:00:00 UTC
    vi.setSystemTime(new Date('2026-01-31T12:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2026-01-26T00:00:00.000Z'); // Monday
    expect(end.toISOString()).toBe('2026-02-01T23:59:59.999Z'); // Sunday
  });

  it('handles year boundary correctly', () => {
    // Thursday 2026-01-01 10:00:00 UTC
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    const { start, end } = getCurrentWeekBounds();

    expect(start.toISOString()).toBe('2025-12-29T00:00:00.000Z'); // Monday
    expect(end.toISOString()).toBe('2026-01-04T23:59:59.999Z'); // Sunday
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
});
