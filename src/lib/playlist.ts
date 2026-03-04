import type { WrappedSong } from './wrapped';

const YOUTUBE_ID_RE = /^[\w-]{1,20}$/;

/**
 * Extract YouTube video IDs from platform links.
 * Supports youtube.com/watch?v=ID, youtu.be/ID, and music.youtube.com/watch?v=ID
 */
export function extractYouTubeVideoIds(songs: WrappedSong[]): string[] {
  const ids: string[] = [];

  for (const song of songs) {
    for (const link of song.platform_links) {
      if (link.platform !== 'youtube' && link.platform !== 'youtubeMusic') continue;

      try {
        const url = new URL(link.url);
        const hostname = url.hostname.replace('www.', '');
        let id: string | null = null;

        if (hostname === 'youtu.be') {
          id = url.pathname.slice(1) || null;
        } else if (
          hostname === 'youtube.com' ||
          hostname === 'music.youtube.com' ||
          hostname === 'm.youtube.com'
        ) {
          id = url.searchParams.get('v');
        }

        if (id && YOUTUBE_ID_RE.test(id)) ids.push(id);
      } catch {
        // Skip invalid URLs
      }

      break; // One YouTube link per song is enough
    }
  }

  return ids;
}

/** Build a YouTube watch_videos URL that creates a temporary playlist. */
export function buildYouTubePlaylistUrl(videoIds: string[]): string | null {
  if (videoIds.length === 0) return null;
  return `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;
}

/** Extract Spotify URLs from songs. */
export function getSpotifyLinks(songs: WrappedSong[]): string[] {
  const urls: string[] = [];

  for (const song of songs) {
    for (const link of song.platform_links) {
      if (link.platform === 'spotify') {
        urls.push(link.url);
        break;
      }
    }
  }

  return urls;
}

/** Format songs for clipboard: "Title - Artist\nURL\n\n" */
export function formatPlaylistForClipboard(
  songs: WrappedSong[],
  platform: 'spotify' | 'youtubeMusic',
): string {
  const platformKey = platform === 'youtubeMusic' ? ['youtube', 'youtubeMusic'] : ['spotify'];

  const lines: string[] = [];

  for (const song of songs) {
    const link = song.platform_links.find((l) => platformKey.includes(l.platform));
    if (!link) continue;
    lines.push(`${song.title} - ${song.artist}\n${link.url}`);
  }

  return lines.join('\n\n');
}
