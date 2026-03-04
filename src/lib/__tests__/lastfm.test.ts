import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectGenre } from '../lastfm';

function makeTagResponse(tags: { name: string; count: number }[]) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ toptags: { tag: tags } }),
  } as unknown as Response;
}

function makeErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
  } as unknown as Response;
}

describe('detectGenre', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('LASTFM_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should return genre from track tags on first call', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      makeTagResponse([
        { name: 'rock', count: 100 },
        { name: 'classic rock', count: 80 },
      ]),
    );

    const result = await detectGenre('Bohemian Rhapsody', 'Queen');

    expect(result).toBe('rock');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('should fallback to artist tags when track tags do not match', async () => {
    const mockFetch = vi.mocked(fetch);
    // Track tags: no genre match
    mockFetch.mockResolvedValueOnce(
      makeTagResponse([
        { name: 'seen live', count: 100 },
        { name: 'favorites', count: 90 },
      ]),
    );
    // Artist tags: genre match
    mockFetch.mockResolvedValueOnce(
      makeTagResponse([
        { name: 'electronic', count: 100 },
        { name: 'ambient', count: 80 },
      ]),
    );

    const result = await detectGenre('Unknown Track', 'Boards of Canada');

    expect(result).toBe('electronic');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should return null when neither track nor artist tags match', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      makeTagResponse([
        { name: 'seen live', count: 100 },
        { name: 'favorites', count: 90 },
      ]),
    );
    mockFetch.mockResolvedValueOnce(
      makeTagResponse([
        { name: 'seen live', count: 100 },
        { name: 'british', count: 80 },
      ]),
    );

    const result = await detectGenre('Some Track', 'Some Artist');

    expect(result).toBeNull();
  });

  it('should return null when track request fails and artist tags do not match', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(makeErrorResponse(500));
    mockFetch.mockResolvedValueOnce(
      makeTagResponse([
        { name: 'seen live', count: 100 },
        { name: 'favorites', count: 80 },
      ]),
    );

    const result = await detectGenre('Track', 'Artist');

    expect(result).toBeNull();
  });

  it('should return null when both requests fail with network error', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await detectGenre('Track', 'Artist');

    expect(result).toBeNull();
  });

  it('should pass track and artist as query parameters with autocorrect=1', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(makeTagResponse([{ name: 'rock', count: 100 }]));

    await detectGenre('Stairway to Heaven', 'Led Zeppelin');

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.searchParams.get('method')).toBe('track.getTopTags');
    expect(url.searchParams.get('track')).toBe('Stairway to Heaven');
    expect(url.searchParams.get('artist')).toBe('Led Zeppelin');
    expect(url.searchParams.get('autocorrect')).toBe('1');
    expect(url.searchParams.get('api_key')).toBe('test-key');
    expect(url.searchParams.get('format')).toBe('json');
  });

  it('should handle empty tag arrays gracefully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(makeTagResponse([]));
    mockFetch.mockResolvedValueOnce(makeTagResponse([]));

    const result = await detectGenre('Track', 'Artist');

    expect(result).toBeNull();
  });

  it.each(['Hip-Hop', 'hip hop', 'rap', 'Rap', 'Hip Hop'])(
    'should match "%s" as hip-hop',
    async (variant) => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(makeTagResponse([{ name: variant, count: 100 }]));

      const result = await detectGenre('Track', 'Artist');
      expect(result).toBe('hip-hop');
    },
  );

  it('should return null when API key is not set', async () => {
    vi.stubEnv('LASTFM_API_KEY', '');

    const result = await detectGenre('Track', 'Artist');

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return null when toptags exists but tag is undefined', async () => {
    const mockFetch = vi.mocked(fetch);
    // Track response: toptags exists but tag is missing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ toptags: {} }),
    } as unknown as Response);
    // Artist response: same
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ toptags: {} }),
    } as unknown as Response);

    const result = await detectGenre('Track', 'Artist');

    expect(result).toBeNull();
  });

  it('should fallback to process.env.LASTFM_API_KEY when import.meta.env key is not set', async () => {
    // Set import.meta.env.LASTFM_API_KEY to undefined so ?? fallback activates

    (import.meta.env as any).LASTFM_API_KEY = undefined;
    process.env.LASTFM_API_KEY = 'process-env-key';

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(makeTagResponse([{ name: 'rock', count: 100 }]));

    const result = await detectGenre('Track', 'Artist');

    expect(result).toBe('rock');
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    expect(url.searchParams.get('api_key')).toBe('process-env-key');

    delete process.env.LASTFM_API_KEY;
  });

  it('should return null when both import.meta.env and process.env API keys are unset', async () => {
    (import.meta.env as any).LASTFM_API_KEY = undefined;
    delete process.env.LASTFM_API_KEY;

    const result = await detectGenre('Track', 'Artist');

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
