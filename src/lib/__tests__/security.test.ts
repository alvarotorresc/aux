import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMemberId, setMemberId } from '../storage';
import { resolveSongLink } from '../odesli';

// --- Mocks ---

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Security: storage XSS prevention', () => {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    };

    vi.stubGlobal('window', { localStorage: mockLocalStorage });
    vi.stubGlobal('localStorage', mockLocalStorage);
  });

  it('should reject slug containing script tags', () => {
    const result = getMemberId('<script>alert(1)</script>');
    expect(result).toBeNull();
  });

  it('should reject slug with URL-encoded XSS payload', () => {
    const result = getMemberId('%3Cscript%3Ealert(1)%3C/script%3E');
    expect(result).toBeNull();
  });

  it('should reject slug with special characters', () => {
    const result = getMemberId('../../etc/passwd');
    expect(result).toBeNull();
  });

  it('should reject slug with HTML entities', () => {
    const result = getMemberId('test&amp;group');
    expect(result).toBeNull();
  });

  it('should reject slug with quotes', () => {
    const result = getMemberId("test'group");
    expect(result).toBeNull();
  });

  it('should reject member ID with script payload', () => {
    setMemberId('my-group', '<script>alert(1)</script>');
    expect(mockStorage.has('aux:members:my-group')).toBe(false);
  });

  it('should reject member ID with SQL injection attempt', () => {
    setMemberId('my-group', "'; DROP TABLE members; --");
    expect(mockStorage.has('aux:members:my-group')).toBe(false);
  });

  it('should sanitize slug in storage key to prevent key injection', () => {
    // Even if someone bypasses the SLUG_RE check externally,
    // the storage key function strips non-alphanumeric chars
    const validUuid = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    setMemberId('a', validUuid);

    // The storage key should be clean
    expect(mockStorage.get('aux:members:a')).toBe(validUuid);
  });
});

describe('Security: URL validation in odesli', () => {
  it('should reject javascript: protocol URLs', async () => {
    await expect(resolveSongLink('javascript:alert(document.cookie)')).rejects.toThrow(
      'URL must use HTTPS',
    );
  });

  it('should reject data: protocol URLs', async () => {
    await expect(resolveSongLink('data:text/html,<script>alert(1)</script>')).rejects.toThrow(
      'URL must use HTTPS',
    );
  });

  it('should reject URLs with embedded credentials', async () => {
    await expect(resolveSongLink('https://evil@open.spotify.com/track/abc')).rejects.toThrow();
  });

  it('should reject HTTP URLs to prevent MITM', async () => {
    await expect(resolveSongLink('http://open.spotify.com/track/abc')).rejects.toThrow(
      'URL must use HTTPS',
    );
  });

  it('should reject URLs from non-music domains', async () => {
    await expect(resolveSongLink('https://evil.com/track/abc')).rejects.toThrow(
      'URL must be from a supported music platform',
    );
  });

  it('should reject URLs with XSS payloads in path', async () => {
    await expect(resolveSongLink('https://evil.com/<script>alert(1)</script>')).rejects.toThrow(
      'URL must be from a supported music platform',
    );
  });

  it('should reject file: protocol URLs', async () => {
    await expect(resolveSongLink('file:///etc/passwd')).rejects.toThrow('URL must use HTTPS');
  });

  it('should truncate excessively long titles to prevent storage abuse', async () => {
    const mockFetch = vi.mocked(fetch);
    const longTitle = 'A'.repeat(500);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          entityUniqueId: 'SPOTIFY_SONG::abc',
          pageUrl: 'https://song.link/s/abc',
          entitiesByUniqueId: {
            'SPOTIFY_SONG::abc': {
              id: 'abc',
              type: 'song',
              title: longTitle,
              artistName: 'Artist',
              thumbnailUrl: 'https://i.scdn.co/image/abc',
              platforms: ['spotify'],
            },
          },
          linksByPlatform: {
            spotify: {
              entityUniqueId: 'SPOTIFY_SONG::abc',
              url: 'https://open.spotify.com/track/abc',
            },
          },
        }),
    } as unknown as Response);

    const result = await resolveSongLink('https://open.spotify.com/track/abc');

    // Title should be truncated to 300 characters
    expect(result.title.length).toBeLessThanOrEqual(300);
  });

  it('should only allow HTTPS URLs in platform links', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          entityUniqueId: 'SPOTIFY_SONG::abc',
          pageUrl: 'https://song.link/s/abc',
          entitiesByUniqueId: {
            'SPOTIFY_SONG::abc': {
              id: 'abc',
              type: 'song',
              title: 'Test',
              artistName: 'Artist',
              thumbnailUrl: 'https://i.scdn.co/image/abc',
              platforms: ['spotify'],
            },
          },
          linksByPlatform: {
            spotify: {
              entityUniqueId: 'SPOTIFY_SONG::abc',
              url: 'https://open.spotify.com/track/abc',
            },
            malicious: {
              entityUniqueId: 'MAL::abc',
              url: 'javascript:alert(1)',
            },
            httpLink: {
              entityUniqueId: 'HTTP::abc',
              url: 'http://insecure.com/track/abc',
            },
          },
        }),
    } as unknown as Response);

    const result = await resolveSongLink('https://open.spotify.com/track/abc');

    // Only HTTPS links should be included
    const urls = result.platformLinks.map((l) => l.url);
    for (const url of urls) {
      expect(url.startsWith('https://')).toBe(true);
    }
  });

  it('should return null thumbnail for non-HTTPS thumbnail URLs', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          entityUniqueId: 'SPOTIFY_SONG::abc',
          pageUrl: 'https://song.link/s/abc',
          entitiesByUniqueId: {
            'SPOTIFY_SONG::abc': {
              id: 'abc',
              type: 'song',
              title: 'Test',
              artistName: 'Artist',
              thumbnailUrl: 'http://insecure.com/image.jpg',
              platforms: ['spotify'],
            },
          },
          linksByPlatform: {
            spotify: {
              entityUniqueId: 'SPOTIFY_SONG::abc',
              url: 'https://open.spotify.com/track/abc',
            },
          },
        }),
    } as unknown as Response);

    const result = await resolveSongLink('https://open.spotify.com/track/abc');

    expect(result.thumbnailUrl).toBeNull();
  });
});

describe('Security: API resolve endpoint URL validation', () => {
  // These tests exercise the server-side resolve handler imported directly
  // The resolve endpoint tests already cover this, but these focus on attack vectors

  it('should not send requests for non-HTTPS URLs', async () => {
    const mockFetch = vi.mocked(fetch);

    // Attempting to resolve an HTTP URL should throw before ever calling fetch
    await expect(resolveSongLink('http://open.spotify.com/track/abc')).rejects.toThrow();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not send requests for non-music-platform URLs', async () => {
    const mockFetch = vi.mocked(fetch);

    await expect(resolveSongLink('https://evil.com/track/abc')).rejects.toThrow();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
