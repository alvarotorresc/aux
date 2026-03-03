import type { APIRoute } from 'astro';
import { detectGenre } from '../../lib/lastfm';

const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';

/** Allowed music platform hostnames (mirrors the client-side whitelist in odesli.ts) */
const ALLOWED_HOSTS = new Set([
  'open.spotify.com',
  'spotify.link',
  'music.youtube.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'music.apple.com',
  'itunes.apple.com',
  'tidal.com',
  'listen.tidal.com',
  'deezer.com',
  'www.deezer.com',
  'deezer.page.link',
  'soundcloud.com',
  'www.soundcloud.com',
  'song.link',
  'album.link',
  'odesli.co',
]);

/**
 * Server-side proxy for the Odesli API.
 * Avoids CORS issues since the browser calls our own origin.
 *
 * GET /api/resolve?url=<encoded-music-url>
 */
export const GET: APIRoute = async ({ url }) => {
  const musicUrl = url.searchParams.get('url');

  if (!musicUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Server-side validation: only allow HTTPS URLs from known music platforms
  try {
    const parsed = new URL(musicUrl);
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
      return new Response(JSON.stringify({ error: 'URL not from a supported music platform' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const endpoint = `${ODESLI_API}?url=${encodeURIComponent(musicUrl)}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      return new Response(await response.text(), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    // Extract title and artist from the primary entity for genre detection
    let genre: string | null = null;
    try {
      const primaryEntity = data.entitiesByUniqueId?.[data.entityUniqueId];
      if (primaryEntity?.title && primaryEntity?.artistName) {
        genre = await detectGenre(primaryEntity.title, primaryEntity.artistName);
      }
    } catch {
      // Genre detection is best-effort
    }

    return new Response(JSON.stringify({ ...data, _detectedGenre: genre }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach song resolution service' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
