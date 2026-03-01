/**
 * In-memory sliding window rate limiter.
 *
 * Tracks timestamps of requests per key (typically IP address).
 * Expired timestamps are pruned on each check. A periodic cleanup
 * removes stale entries to prevent unbounded memory growth.
 */

interface RateLimiterOptions {
  /** Maximum requests allowed within the window. Default: 10 */
  maxRequests?: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
}

interface RateLimiter {
  /** Returns true if the request is allowed, false if rate-limited */
  check: (key: string) => boolean;
  /** Returns the number of tracked keys (for testing/monitoring) */
  size: () => number;
}

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimiter {
  const maxRequests = options.maxRequests ?? 10;
  const windowMs = options.windowMs ?? 60_000;

  /** Map of key -> array of request timestamps within the window */
  const requests = new Map<string, number[]>();

  /** Counter to trigger periodic cleanup of stale entries */
  let checkCount = 0;
  const CLEANUP_INTERVAL = 100;

  function cleanup(): void {
    const now = Date.now();
    const cutoff = now - windowMs;

    for (const [key, timestamps] of requests) {
      const valid = timestamps.filter((t) => t > cutoff);
      if (valid.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, valid);
      }
    }
  }

  function check(key: string): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Periodic cleanup to prevent memory leak from abandoned keys
    checkCount++;
    if (checkCount >= CLEANUP_INTERVAL) {
      checkCount = 0;
      cleanup();
    }

    const timestamps = requests.get(key);

    if (!timestamps) {
      requests.set(key, [now]);
      return true;
    }

    // Prune expired timestamps for this key
    const valid = timestamps.filter((t) => t > cutoff);

    if (valid.length >= maxRequests) {
      requests.set(key, valid);
      return false;
    }

    valid.push(now);
    requests.set(key, valid);
    return true;
  }

  function size(): number {
    return requests.size;
  }

  return { check, size };
}
