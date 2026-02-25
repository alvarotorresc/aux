import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveSongLink } from '../odesli';

// Minimal valid Odesli API response for a Spotify track
function makeOdesliResponse(
  overrides: Partial<{
    entityUniqueId: string;
    pageUrl: string;
    entitiesByUniqueId: Record<string, unknown>;
    linksByPlatform: Record<string, { entityUniqueId: string; url: string }>;
  }> = {},
) {
  return {
    entityUniqueId: 'SPOTIFY_SONG::abc123',
    userCountry: 'US',
    pageUrl: 'https://song.link/s/abc123',
    entitiesByUniqueId: {
      'SPOTIFY_SONG::abc123': {
        id: 'abc123',
        type: 'song',
        title: 'Bohemian Rhapsody',
        artistName: 'Queen',
        thumbnailUrl: 'https://i.scdn.co/image/abc',
        platforms: ['spotify', 'youtube'],
      },
    },
    linksByPlatform: {
      spotify: {
        entityUniqueId: 'SPOTIFY_SONG::abc123',
        url: 'https://open.spotify.com/track/abc123',
      },
      youtube: {
        entityUniqueId: 'YOUTUBE_SONG::abc123',
        url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
      },
    },
    ...overrides,
  };
}

function makeOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function makeErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response;
}

describe('resolveSongLink', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should throw error when URL is empty', async () => {
    await expect(resolveSongLink('')).rejects.toThrow('URL cannot be empty');
  });

  it('should throw error when URL is whitespace only', async () => {
    await expect(resolveSongLink('   ')).rejects.toThrow('URL cannot be empty');
  });

  it('should throw error when URL is invalid', async () => {
    await expect(resolveSongLink('not-a-url')).rejects.toThrow('Invalid URL format');
  });

  it('should throw error when URL uses an unsupported protocol', async () => {
    await expect(resolveSongLink('ftp://open.spotify.com/track/abc')).rejects.toThrow(
      'URL must use HTTPS',
    );
  });

  it('should throw error when URL is from an unsupported platform', async () => {
    await expect(resolveSongLink('https://example.com/track/abc')).rejects.toThrow(
      'URL must be from a supported music platform',
    );
  });

  it('should resolve a Spotify link and return cross-platform data', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeOkResponse(makeOdesliResponse()));

    const result = await resolveSongLink('https://open.spotify.com/track/abc123');

    expect(result.title).toBe('Bohemian Rhapsody');
    expect(result.artist).toBe('Queen');
    expect(result.thumbnailUrl).toBe('https://i.scdn.co/image/abc');
    expect(result.pageUrl).toBe('https://song.link/s/abc123');
    expect(result.album).toBeNull();
    const spotify = result.platformLinks.find((l) => l.platform === 'spotify');
    const youtube = result.platformLinks.find((l) => l.platform === 'youtube');
    expect(spotify?.url).toBe('https://open.spotify.com/track/abc123');
    expect(youtube?.url).toBe('https://www.youtube.com/watch?v=fJ9rUzIMcZQ');
  });

  it('should call the Odesli API with the encoded URL', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeOkResponse(makeOdesliResponse()));

    const spotifyUrl = 'https://open.spotify.com/track/abc123';
    await resolveSongLink(spotifyUrl);

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/api/resolve');
    expect(calledUrl).toContain(encodeURIComponent(spotifyUrl));
  });

  it('should throw error when API returns 404', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeErrorResponse(404));

    await expect(resolveSongLink('https://open.spotify.com/track/notfound')).rejects.toThrow(
      'Song not found. Check the URL and try again.',
    );
  });

  it('should throw error when API returns a non-404 error status', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeErrorResponse(500));

    await expect(resolveSongLink('https://open.spotify.com/track/abc123')).rejects.toThrow(
      'Song resolution failed (500)',
    );
  });

  it('should throw error when network request fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(resolveSongLink('https://open.spotify.com/track/abc123')).rejects.toThrow(
      'Could not reach the song resolution service',
    );
  });

  it('should throw error when response has no primary entity', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      makeOkResponse(
        makeOdesliResponse({
          // entityUniqueId points to an entity that does not exist in entitiesByUniqueId
          entityUniqueId: 'SPOTIFY_SONG::missing',
          entitiesByUniqueId: {},
        }),
      ),
    );

    await expect(resolveSongLink('https://open.spotify.com/track/abc123')).rejects.toThrow(
      'Could not extract song information from the resolved link.',
    );
  });

  it('should add fallback search links when spotify is absent', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      makeOkResponse(
        makeOdesliResponse({
          linksByPlatform: {
            youtube: {
              entityUniqueId: 'YOUTUBE_SONG::abc123',
              url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
            },
          },
        }),
      ),
    );

    const result = await resolveSongLink('https://open.spotify.com/track/abc123');

    const spotify = result.platformLinks.find((l) => l.platform === 'spotify');
    expect(spotify).toBeDefined();
    expect(spotify!.url).toContain('open.spotify.com/search/');
  });

  it('should include youtubeMusic as a separate platform link', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      makeOkResponse(
        makeOdesliResponse({
          linksByPlatform: {
            spotify: {
              entityUniqueId: 'SPOTIFY_SONG::abc123',
              url: 'https://open.spotify.com/track/abc123',
            },
            youtubeMusic: {
              entityUniqueId: 'YOUTUBE_MUSIC_SONG::abc123',
              url: 'https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
            },
          },
        }),
      ),
    );

    const result = await resolveSongLink('https://open.spotify.com/track/abc123');

    const ytMusic = result.platformLinks.find((l) => l.platform === 'youtubeMusic');
    expect(ytMusic).toBeDefined();
    expect(ytMusic!.url).toBe('https://music.youtube.com/watch?v=fJ9rUzIMcZQ');
  });
});
