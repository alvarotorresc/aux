import { useState, useCallback } from 'react';
import type { Locale } from '../../../site.config';
import type { WrappedSong } from '../../lib/wrapped';
import { t } from '../../i18n';
import {
  extractYouTubeVideoIds,
  buildYouTubePlaylistUrl,
  getSpotifyLinks,
  formatPlaylistForClipboard,
} from '../../lib/playlist';
import { Button } from '../../components/ui/Button';

type Platform = 'spotify' | 'youtubeMusic';

interface PlaylistCardProps {
  songs: WrappedSong[];
  locale: Locale;
}

const PLATFORM_TABS: { key: Platform; label: string; hex: string }[] = [
  { key: 'spotify', label: 'Spotify', hex: '#1DB954' },
  { key: 'youtubeMusic', label: 'YT Music', hex: '#FF0000' },
];

function hasPlatformLink(song: WrappedSong, platform: Platform): boolean {
  const keys = platform === 'youtubeMusic' ? ['youtube', 'youtubeMusic'] : ['spotify'];
  return song.platform_links.some((l) => keys.includes(l.platform));
}

export function PlaylistCard({ songs, locale }: PlaylistCardProps) {
  const [platform, setPlatform] = useState<Platform>('spotify');
  const [copied, setCopied] = useState(false);

  const filteredSongs = songs.filter((s) => hasPlatformLink(s, platform));

  const handleCopy = useCallback(async () => {
    const text = formatPlaylistForClipboard(songs, platform);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [songs, platform]);

  const handleOpenYouTube = useCallback(() => {
    const ids = extractYouTubeVideoIds(songs);
    const url = buildYouTubePlaylistUrl(ids);
    if (url) window.open(url, '_blank', 'noopener');
  }, [songs]);

  const handleOpenSpotify = useCallback(() => {
    const links = getSpotifyLinks(songs);
    const toOpen = links.slice(0, 5);
    for (const url of toOpen) {
      window.open(url, '_blank', 'noopener');
    }
  }, [songs]);

  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
        {t('wrapped.playlist', locale)}
      </h2>

      {/* Platform tabs */}
      <div className="mb-4 flex gap-2" role="tablist">
        {PLATFORM_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={platform === tab.key}
            onClick={() => {
              setPlatform(tab.key);
              setCopied(false);
            }}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              platform === tab.key
                ? 'border-current bg-current/10 text-current'
                : 'border-border bg-bg-card text-text-secondary hover:text-text'
            }`}
            style={platform === tab.key ? { color: tab.hex } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Song list or empty state */}
      {filteredSongs.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">
          {t('wrapped.noLinksForPlatform', locale)}
        </p>
      ) : (
        <>
          <div className="mb-4 flex max-h-60 flex-col gap-1.5 overflow-y-auto">
            {filteredSongs.map((song, i) => (
              <div
                key={song.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-bg p-2"
              >
                <span className="w-5 shrink-0 text-center font-mono text-xs text-text-tertiary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{song.title}</p>
                  <p className="truncate text-xs text-text-tertiary">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {platform === 'youtubeMusic' ? (
              <Button variant="primary" size="sm" onClick={handleOpenYouTube}>
                {t('wrapped.openPlaylist', locale)}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleOpenSpotify}>
                {t('wrapped.openSongs', locale)}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? t('wrapped.linksCopied', locale) : t('wrapped.copyLinks', locale)}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
