import { matchGenre } from './genres';

const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/';
const MAX_TAGS = 10;

async function fetchTopTags(
  apiKey: string,
  method: string,
  params: Record<string, string>,
): Promise<string[]> {
  try {
    const qs = new URLSearchParams({
      method,
      api_key: apiKey,
      format: 'json',
      autocorrect: '1',
      ...params,
    });
    const res = await fetch(`${LASTFM_API}?${qs}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      toptags?: { tag?: { name: string; count: number }[] };
    };
    return (data.toptags?.tag ?? []).slice(0, MAX_TAGS).map((t) => t.name);
  } catch {
    return [];
  }
}

export async function detectGenre(title: string, artist: string): Promise<string | null> {
  // Server-side only: LASTFM_API_KEY is not exposed to the client (no PUBLIC_ prefix)
  const apiKey = import.meta.env.LASTFM_API_KEY ?? process.env.LASTFM_API_KEY ?? '';
  if (!apiKey) return null;

  const trackTags = await fetchTopTags(apiKey, 'track.getTopTags', { track: title, artist });
  const trackGenre = matchGenre(trackTags);
  if (trackGenre) return trackGenre;

  const artistTags = await fetchTopTags(apiKey, 'artist.getTopTags', { artist });
  return matchGenre(artistTags);
}
