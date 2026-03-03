import type { APIRoute } from 'astro';
import { createRateLimiter } from '../../lib/rate-limiter';
import { detectGenre } from '../../lib/lastfm';

const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';

/** Max response body size from Odesli API (500 KB) to prevent memory abuse */
const MAX_RESPONSE_BYTES = 512 * 1024;

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

/** In-memory rate limiter — 10 requests per minute per IP */
const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 });

/**
 * Extract client IP from the request. Netlify sets X-Forwarded-For;
 * take only the first address (leftmost = original client).
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return 'unknown';
}

/**
 * Server-side proxy for the Odesli API.
 * Avoids CORS issues since the browser calls our own origin.
 *
 * GET /api/resolve?url=<encoded-music-url>
 */
export const GET: APIRoute = async ({ url, request }) => {
  // Rate limiting
  const clientIp = getClientIp(request);
  if (!rateLimiter.check(clientIp)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    });
  }

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

    const body = await response.text();

    // Guard against unexpectedly large responses from the upstream API
    if (body.length > MAX_RESPONSE_BYTES) {
      return new Response(JSON.stringify({ error: 'Response too large' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      return new Response(body, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse response and detect genre server-side (Last.fm API key is not exposed to client)
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body);
    } catch {
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let genre: string | null = null;
    try {
      const entities = data.entitiesByUniqueId as
        | Record<string, Record<string, string>>
        | undefined;
      const primaryEntity = entities?.[data.entityUniqueId as string];
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
