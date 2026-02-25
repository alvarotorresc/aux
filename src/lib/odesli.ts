/** Odesli (song.link) API wrapper — resolves music URLs to cross-platform data */

const ODESLI_API = 'https://api.song.link/v1-alpha.1/links';

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

export interface ResolvedSong {
  title: string;
  artist: string;
  album: string | null;
  thumbnailUrl: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  pageUrl: string;
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

  if (!parsed.protocol.startsWith('http')) {
    throw new Error('URL must start with http or https');
  }

  const endpoint = `${ODESLI_API}?url=${encodeURIComponent(trimmed)}`;

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

  // Extract platform-specific URLs
  const spotifyLink = data.linksByPlatform.spotify;
  const youtubeLink = data.linksByPlatform.youtube ?? data.linksByPlatform.youtubeMusic;

  return {
    title: primaryEntity.title ?? 'Unknown Title',
    artist: primaryEntity.artistName ?? 'Unknown Artist',
    album: null, // Odesli entity does not reliably expose album name
    thumbnailUrl: primaryEntity.thumbnailUrl ?? null,
    spotifyUrl: spotifyLink?.url ?? null,
    youtubeUrl: youtubeLink?.url ?? null,
    pageUrl: data.pageUrl,
  };
}
