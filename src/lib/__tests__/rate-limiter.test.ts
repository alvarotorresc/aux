import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../rate-limiter';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    expect(limiter.check('192.168.1.1')).toBe(true);
    expect(limiter.check('192.168.1.1')).toBe(true);
    expect(limiter.check('192.168.1.1')).toBe(true);
  });

  it('should block requests that exceed the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    expect(limiter.check('192.168.1.1')).toBe(true);
    expect(limiter.check('192.168.1.1')).toBe(true);
    expect(limiter.check('192.168.1.1')).toBe(true);
    expect(limiter.check('192.168.1.1')).toBe(false);
    expect(limiter.check('192.168.1.1')).toBe(false);
  });

  it('should track each key independently', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });

    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(false);

    // Different key should still be allowed
    expect(limiter.check('ip-b')).toBe(true);
    expect(limiter.check('ip-b')).toBe(true);
    expect(limiter.check('ip-b')).toBe(false);
  });

  it('should allow requests again after the window expires (sliding window)', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });

    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(true);
    expect(limiter.check('ip-a')).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(60_001);

    expect(limiter.check('ip-a')).toBe(true);
  });

  it('should use sliding window — only old timestamps expire', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });

    // t=0s: first request
    expect(limiter.check('ip-a')).toBe(true);

    // t=20s: second request
    vi.advanceTimersByTime(20_000);
    expect(limiter.check('ip-a')).toBe(true);

    // t=40s: third request
    vi.advanceTimersByTime(20_000);
    expect(limiter.check('ip-a')).toBe(true);

    // t=40s: fourth request — blocked
    expect(limiter.check('ip-a')).toBe(false);

    // t=61s: first request has expired, but second and third are still within window
    vi.advanceTimersByTime(21_000);
    expect(limiter.check('ip-a')).toBe(true);

    // Now at limit again (requests at t=20, t=40, t=61)
    expect(limiter.check('ip-a')).toBe(false);
  });

  it('should clean up stale entries when cleanup runs', () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60_000 });

    // Create entries for many keys (100 checks triggers internal cleanup)
    for (let i = 0; i < 99; i++) {
      limiter.check(`ip-${i}`);
    }
    expect(limiter.size()).toBe(99);

    // Advance past the window so all entries become stale
    vi.advanceTimersByTime(60_001);

    // The 100th check triggers cleanup
    limiter.check('ip-new');

    // Only the new entry should remain after cleanup
    expect(limiter.size()).toBe(1);
  });

  it('should use default values when no options are provided', () => {
    const limiter = createRateLimiter();

    // Default is 10 requests per 60s — should allow 10
    for (let i = 0; i < 10; i++) {
      expect(limiter.check('ip-a')).toBe(true);
    }
    expect(limiter.check('ip-a')).toBe(false);
  });

  it('should handle empty string key', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });

    expect(limiter.check('')).toBe(true);
    expect(limiter.check('')).toBe(false);
  });
});
