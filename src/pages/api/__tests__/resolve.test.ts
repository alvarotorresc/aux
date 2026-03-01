import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../resolve';

// --- Helpers ---

/** Build a minimal Astro APIContext with the given search params */
function makeContext(params?: Record<string, string>) {
  const url = new URL('http://localhost:4321/api/resolve');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  // Cast to the shape expected by the APIRoute handler
  return { url } as Parameters<typeof GET>[0];
}

/** Parse the JSON body and status from a Response */
async function parseResponse(response: Response) {
  const body = await response.json();
  return { status: response.status, body };
}

describe('GET /api/resolve', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- Missing / invalid URL parameter ---

  it('should return 400 when url parameter is missing', async () => {
    const response = await GET(makeContext());
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Missing url parameter');
  });

  it('should return 400 when url parameter is empty string', async () => {
    const response = await GET(makeContext({ url: '' }));
    const { status } = await parseResponse(response);

    // Empty string is treated as missing by searchParams.get
    expect(status).toBe(400);
  });

  it('should return 400 when url is malformed', async () => {
    const response = await GET(makeContext({ url: 'not-a-url' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('Invalid URL');
  });

  // --- Unsupported platforms ---

  it('should return 400 when url is from an unsupported platform', async () => {
    const response = await GET(makeContext({ url: 'https://example.com/track/123' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('URL not from a supported music platform');
  });

  it('should return 400 when url uses HTTP protocol instead of HTTPS', async () => {
    const response = await GET(makeContext({ url: 'http://open.spotify.com/track/abc' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('URL not from a supported music platform');
  });

  // --- Valid platform URLs forwarded to Odesli ---

  const validPlatformUrls = [
    { platform: 'Spotify', url: 'https://open.spotify.com/track/abc123' },
    { platform: 'Spotify short link', url: 'https://spotify.link/abc123' },
    { platform: 'YouTube Music', url: 'https://music.youtube.com/watch?v=abc123' },
    { platform: 'YouTube', url: 'https://www.youtube.com/watch?v=abc123' },
    { platform: 'YouTube short', url: 'https://youtu.be/abc123' },
    { platform: 'Apple Music', url: 'https://music.apple.com/us/album/abc123' },
    { platform: 'iTunes', url: 'https://itunes.apple.com/us/album/abc123' },
    { platform: 'Tidal', url: 'https://tidal.com/browse/track/123' },
    { platform: 'Tidal listen', url: 'https://listen.tidal.com/track/123' },
    { platform: 'Deezer', url: 'https://www.deezer.com/track/123' },
    { platform: 'Deezer page link', url: 'https://deezer.page.link/abc' },
    { platform: 'SoundCloud', url: 'https://soundcloud.com/artist/track' },
    { platform: 'song.link', url: 'https://song.link/s/abc123' },
    { platform: 'album.link', url: 'https://album.link/s/abc123' },
    { platform: 'odesli.co', url: 'https://odesli.co/s/abc123' },
  ];

  for (const { platform, url } of validPlatformUrls) {
    it(`should forward ${platform} URL to Odesli API`, async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const response = await GET(makeContext({ url }));

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledOnce();

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('api.song.link/v1-alpha.1/links');
      expect(calledUrl).toContain(encodeURIComponent(url));
    });
  }

  // --- Odesli API response forwarding ---

  it('should forward the Odesli API response body and status as-is', async () => {
    const mockFetch = vi.mocked(fetch);
    const odesliBody = { entityUniqueId: 'SPOTIFY::abc', pageUrl: 'https://song.link/s/abc' };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(odesliBody), { status: 200 }));

    const response = await GET(makeContext({ url: 'https://open.spotify.com/track/abc123' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(200);
    expect(body.entityUniqueId).toBe('SPOTIFY::abc');
  });

  it('should forward Odesli 404 status when song is not found', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'not found' }), { status: 404 }),
    );

    const response = await GET(makeContext({ url: 'https://open.spotify.com/track/notfound' }));

    expect(response.status).toBe(404);
  });

  it('should forward Odesli 500 status when API has internal error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: 'internal' }), { status: 500 }),
    );

    const response = await GET(makeContext({ url: 'https://open.spotify.com/track/abc123' }));

    expect(response.status).toBe(500);
  });

  // --- Network errors ---

  it('should return 502 when fetch to Odesli API fails with network error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const response = await GET(makeContext({ url: 'https://open.spotify.com/track/abc123' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(502);
    expect(body.error).toBe('Failed to reach song resolution service');
  });

  // --- Security: protocol enforcement ---

  it('should reject FTP protocol URLs', async () => {
    const response = await GET(makeContext({ url: 'ftp://open.spotify.com/track/abc' }));
    const { status, body } = await parseResponse(response);

    expect(status).toBe(400);
    expect(body.error).toBe('URL not from a supported music platform');
  });

  it('should reject javascript: protocol URLs', async () => {
    const response = await GET(makeContext({ url: 'javascript:alert(1)' }));

    expect(response.status).toBe(400);
  });

  it('should reject data: protocol URLs', async () => {
    const response = await GET(makeContext({ url: 'data:text/html,<script>alert(1)</script>' }));

    expect(response.status).toBe(400);
  });

  // --- Content-Type header ---

  it('should always return Content-Type application/json', async () => {
    const response = await GET(makeContext());

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
