/** Odesli (song.link) API wrapper — resolves music URLs to cross-platform data */

/** Use our own server-side proxy to avoid CORS issues with the Odesli API */
const RESOLVE_API = '/api/resolve';

/** Allowed music platform hostnames (and their common short-link domains) */
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

interface OdesliEntity {
  id: string;
  type: string;
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
  platforms: string[];
}

interface OdesliResponse {
  entityUniqueId: string;
  userCountry: string;
  pageUrl: string;
  entitiesByUniqueId: Record<string, OdesliEntity>;
  linksByPlatform: Record<
    string,
    {
      entityUniqueId: string;
      url: string;
    }
  >;
}

export interface PlatformLink {
  platform: string;
  url: string;
}

export interface ResolvedSong {
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  thumbnailUrl: string | null;
  platformLinks: PlatformLink[];
  pageUrl: string;
}

/**
 * Returns the URL string only if it parses as an https URL; otherwise null.
 * Used to sanitise URLs received from the Odesli API before storing them.
 */
function safeHttpsUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Resolves a music URL (Spotify, YouTube, Apple Music, etc.) to cross-platform data
 * via the Odesli (song.link) API.
 *
 * @throws Error if the URL cannot be resolved or the API is unreachable
 */
export async function resolveSongLink(url: string): Promise<ResolvedSong> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('URL cannot be empty');
  }

  // Basic URL validation
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Only allow https. http short-links (e.g. spotify.link) redirect to https anyway,
  // so requiring https here avoids leaking the request over plain HTTP.
  if (parsed.protocol !== 'https:') {
    throw new Error('URL must use HTTPS');
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      'URL must be from a supported music platform (Spotify, YouTube, Apple Music, Tidal, Deezer, SoundCloud)',
    );
  }

  const endpoint = `${RESOLVE_API}?url=${encodeURIComponent(trimmed)}`;

  let response: Response;
  try {
    response = await fetch(endpoint);
  } catch {
    throw new Error('Could not reach the song resolution service. Try again later.');
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Song not found. Check the URL and try again.');
    }
    throw new Error(`Song resolution failed (${response.status}). Try again later.`);
  }

  let data: OdesliResponse;
  try {
    data = (await response.json()) as OdesliResponse;
  } catch {
    throw new Error('Invalid response from song resolution service.');
  }

  // Extract the primary entity
  const primaryEntity = data.entitiesByUniqueId[data.entityUniqueId];
  if (!primaryEntity) {
    throw new Error('Could not extract song information from the resolved link.');
  }

  // Extract all platform links, sanitise each URL
  const platformLinks: PlatformLink[] = [];
  for (const [platform, link] of Object.entries(data.linksByPlatform)) {
    const safeUrl = safeHttpsUrl(link?.url);
    if (safeUrl) {
      platformLinks.push({ platform, url: safeUrl });
    }
  }

  const title = (primaryEntity.title ?? 'Unknown Title').slice(0, 300);
  const artist = (primaryEntity.artistName ?? 'Unknown Artist').slice(0, 300);
  const searchQuery = encodeURIComponent(`${title} ${artist}`);

  // Fallback: if Spotify is missing, add a search link
  if (!platformLinks.some((l) => l.platform === 'spotify')) {
    platformLinks.push({
      platform: 'spotify',
      url: `https://open.spotify.com/search/${searchQuery}`,
    });
  }

  // Fallback: if YouTube Music is missing, add a search link
  if (!platformLinks.some((l) => l.platform === 'youtubeMusic')) {
    platformLinks.push({
      platform: 'youtubeMusic',
      url: `https://music.youtube.com/search?q=${searchQuery}`,
    });
  }

  const thumbnailUrl = safeHttpsUrl(primaryEntity.thumbnailUrl);
  const pageUrl = safeHttpsUrl(data.pageUrl);

  if (!pageUrl) {
    throw new Error('Invalid page URL returned by song resolution service.');
  }

  // Genre is detected server-side in /api/resolve and passed as _detectedGenre
  const genre: string | null =
    ((data as unknown as Record<string, unknown>)._detectedGenre as string | null) ?? null;

  return {
    title,
    artist,
    album: null,
    genre,
    thumbnailUrl,
    platformLinks,
    pageUrl,
  };
}
