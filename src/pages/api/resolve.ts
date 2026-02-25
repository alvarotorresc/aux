import type { APIRoute } from 'astro';

const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';

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

  try {
    const endpoint = `${ODESLI_API}?url=${encodeURIComponent(musicUrl)}`;
    const response = await fetch(endpoint);

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to reach song resolution service' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
