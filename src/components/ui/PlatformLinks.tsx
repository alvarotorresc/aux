interface PlatformLink {
  platform: string;
  url: string;
}

interface PlatformLinksProps {
  links: PlatformLink[];
}

function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** Display order and labels for known platforms */
const PLATFORM_CONFIG: Record<string, { label: string; color: string }> = {
  spotify: { label: 'Spotify', color: 'spotify' },
  youtubeMusic: { label: 'YT Music', color: 'youtube' },
  youtube: { label: 'YouTube', color: 'youtube' },
  appleMusic: { label: 'Apple Music', color: 'text-secondary' },
  tidal: { label: 'Tidal', color: 'text-secondary' },
  deezer: { label: 'Deezer', color: 'text-secondary' },
  amazonMusic: { label: 'Amazon', color: 'text-secondary' },
  soundcloud: { label: 'SoundCloud', color: 'text-secondary' },
};

/** Ordered list of platforms to prioritize */
const PLATFORM_ORDER = [
  'spotify',
  'youtubeMusic',
  'youtube',
  'appleMusic',
  'tidal',
  'deezer',
  'amazonMusic',
  'soundcloud',
];

export function PlatformLinks({ links }: PlatformLinksProps) {
  if (!links || links.length === 0) return null;

  // Sort by priority and filter to safe URLs
  const sorted = [...links]
    .sort((a, b) => {
      const ai = PLATFORM_ORDER.indexOf(a.platform);
      const bi = PLATFORM_ORDER.indexOf(b.platform);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .filter((l) => safeExternalUrl(l.url) !== null);

  if (sorted.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((link) => {
        const config = PLATFORM_CONFIG[link.platform];
        if (!config) return null;
        const colorClass = config.color;

        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-md border border-${colorClass}/20 bg-${colorClass}/10 px-2.5 py-1 text-[11px] font-medium text-${colorClass} transition-opacity hover:opacity-80`}
          >
            {config.label}
          </a>
        );
      })}
    </div>
  );
}
