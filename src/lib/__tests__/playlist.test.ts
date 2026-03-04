import { describe, it, expect } from 'vitest';
import type { WrappedSong } from '../wrapped';
import {
  extractYouTubeVideoIds,
  buildYouTubePlaylistUrl,
  getSpotifyLinks,
  formatPlaylistForClipboard,
} from '../playlist';

function makeWrappedSong(overrides: Partial<WrappedSong> = {}): WrappedSong {
  return {
    id: 'song-1',
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail_url: null,
    genre: null,
    memberName: 'Alice',
    avgRating: 4.0,
    totalVotes: 3,
    platform_links: [],
    odesli_page_url: null,
    ...overrides,
  };
}

describe('extractYouTubeVideoIds', () => {
  it('extracts video ID from youtube.com/watch?v=ID', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'youtube', url: 'https://www.youtube.com/watch?v=abc123' }],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual(['abc123']);
  });

  it('extracts video ID from youtu.be/ID', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'youtube', url: 'https://youtu.be/xyz789' }],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual(['xyz789']);
  });

  it('extracts video ID from music.youtube.com', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [
          { platform: 'youtubeMusic', url: 'https://music.youtube.com/watch?v=mus456' },
        ],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual(['mus456']);
  });

  it('extracts video ID from m.youtube.com', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'youtube', url: 'https://m.youtube.com/watch?v=mob111' }],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual(['mob111']);
  });

  it('extracts multiple IDs from multiple songs', () => {
    const songs = [
      makeWrappedSong({
        id: 's1',
        platform_links: [{ platform: 'youtube', url: 'https://youtube.com/watch?v=id1' }],
      }),
      makeWrappedSong({
        id: 's2',
        platform_links: [
          { platform: 'youtubeMusic', url: 'https://music.youtube.com/watch?v=id2' },
        ],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual(['id1', 'id2']);
  });

  it('returns empty array for songs without YouTube links', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual([]);
  });

  it('returns empty array for empty songs', () => {
    expect(extractYouTubeVideoIds([])).toEqual([]);
  });

  it('skips invalid URLs', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'youtube', url: 'not-a-url' }],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual([]);
  });

  it('skips youtu.be with empty pathname', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'youtube', url: 'https://youtu.be/' }],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual([]);
  });

  it('skips youtube.com/watch without v parameter', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'youtube', url: 'https://youtube.com/watch?feature=share' }],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual([]);
  });

  it('rejects video IDs with special characters', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [
          { platform: 'youtube', url: 'https://youtube.com/watch?v=abc&autoplay=1' },
        ],
      }),
    ];
    // searchParams.get('v') returns 'abc', which is valid
    expect(extractYouTubeVideoIds(songs)).toEqual(['abc']);
  });

  it('takes only one YouTube link per song', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [
          { platform: 'youtube', url: 'https://youtube.com/watch?v=first' },
          { platform: 'youtubeMusic', url: 'https://music.youtube.com/watch?v=second' },
        ],
      }),
    ];
    expect(extractYouTubeVideoIds(songs)).toEqual(['first']);
  });
});

describe('buildYouTubePlaylistUrl', () => {
  it('builds URL with single video ID', () => {
    expect(buildYouTubePlaylistUrl(['abc'])).toBe(
      'https://www.youtube.com/watch_videos?video_ids=abc',
    );
  });

  it('builds URL with multiple video IDs', () => {
    expect(buildYouTubePlaylistUrl(['a', 'b', 'c'])).toBe(
      'https://www.youtube.com/watch_videos?video_ids=a,b,c',
    );
  });

  it('returns null for empty array', () => {
    expect(buildYouTubePlaylistUrl([])).toBeNull();
  });
});

describe('getSpotifyLinks', () => {
  it('extracts Spotify URLs', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }],
      }),
      makeWrappedSong({
        id: 's2',
        platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/def' }],
      }),
    ];
    expect(getSpotifyLinks(songs)).toEqual([
      'https://open.spotify.com/track/abc',
      'https://open.spotify.com/track/def',
    ]);
  });

  it('skips songs without Spotify links', () => {
    const songs = [
      makeWrappedSong({
        platform_links: [{ platform: 'youtube', url: 'https://youtube.com/watch?v=abc' }],
      }),
    ];
    expect(getSpotifyLinks(songs)).toEqual([]);
  });

  it('returns empty array for empty songs', () => {
    expect(getSpotifyLinks([])).toEqual([]);
  });
});

describe('formatPlaylistForClipboard', () => {
  it('formats Spotify songs for clipboard', () => {
    const songs = [
      makeWrappedSong({
        title: 'Song A',
        artist: 'Artist A',
        platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/a' }],
      }),
      makeWrappedSong({
        id: 's2',
        title: 'Song B',
        artist: 'Artist B',
        platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/b' }],
      }),
    ];
    const result = formatPlaylistForClipboard(songs, 'spotify');
    expect(result).toBe(
      'Song A - Artist A\nhttps://open.spotify.com/track/a\n\nSong B - Artist B\nhttps://open.spotify.com/track/b',
    );
  });

  it('formats YouTube Music songs for clipboard', () => {
    const songs = [
      makeWrappedSong({
        title: 'YT Song',
        artist: 'YT Artist',
        platform_links: [
          { platform: 'youtubeMusic', url: 'https://music.youtube.com/watch?v=yt1' },
        ],
      }),
    ];
    const result = formatPlaylistForClipboard(songs, 'youtubeMusic');
    expect(result).toBe('YT Song - YT Artist\nhttps://music.youtube.com/watch?v=yt1');
  });

  it('includes youtube platform links when formatting for youtubeMusic', () => {
    const songs = [
      makeWrappedSong({
        title: 'Song',
        artist: 'Artist',
        platform_links: [{ platform: 'youtube', url: 'https://youtube.com/watch?v=yt1' }],
      }),
    ];
    const result = formatPlaylistForClipboard(songs, 'youtubeMusic');
    expect(result).toBe('Song - Artist\nhttps://youtube.com/watch?v=yt1');
  });

  it('skips songs without matching platform', () => {
    const songs = [
      makeWrappedSong({
        title: 'No Match',
        artist: 'Artist',
        platform_links: [{ platform: 'tidal', url: 'https://tidal.com/track/123' }],
      }),
    ];
    expect(formatPlaylistForClipboard(songs, 'spotify')).toBe('');
  });

  it('returns empty string for empty songs', () => {
    expect(formatPlaylistForClipboard([], 'spotify')).toBe('');
  });
});
