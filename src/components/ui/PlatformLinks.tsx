import type { ReactNode } from 'react';

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

/** SVG icon props shared by all platform icons */
const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
};

/** Compact SVG icons for each platform */
const PLATFORM_ICONS: Record<string, ReactNode> = {
  spotify: (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.4-1 .2-2.7-1.6-6-2-10-1.1-.4.1-.8-.2-.8-.6-.1-.4.2-.8.6-.8 4.3-1 8-0.6 11 1.2.3.2.4.7.2 1.1zm1.5-3.3c-.3.4-.8.5-1.2.3-3.1-1.9-7.7-2.5-11.3-1.3-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.1-1.3 9.2-.7 12.7 1.5.4.2.5.8.3 1.2zm.1-3.4c-3.7-2.2-9.8-2.4-13.3-1.3-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 4.1-1.3 10.8-1 15.1 1.5.5.3.7.9.4 1.4-.3.5-.9.6-1.5.3z" />
    </svg>
  ),
  youtube: (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.5.5c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.5 9.5.5 9.5.5s7.6 0 9.5-.5c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.4 3.6-6.4 3.6z" />
    </svg>
  ),
  youtubeMusic: (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 19.2c-4 0-7.2-3.2-7.2-7.2S8 4.8 12 4.8s7.2 3.2 7.2 7.2-3.2 7.2-7.2 7.2zM9.6 16.2l6.6-4.2-6.6-4.2v8.4z" />
    </svg>
  ),
  appleMusic: (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M23.9 6.7V17c0 2.4-1.6 4.5-3.9 5.2-1.5.4-3.1-.1-4.1-1.2-.7-.7-1-1.7-.9-2.7.2-1.6 1.5-2.9 3.1-3.1l2.4-.3V6.3l-10 2.2v10.3c0 2.1-1.3 3.9-3.2 4.7-1.7.6-3.5.1-4.6-1.1-.8-.8-1.1-1.8-1-2.9.2-1.6 1.5-2.9 3.1-3.1L7.3 16V5.6c0-1.1.7-2 1.7-2.3l11.9-3c1.2-.3 2.4.4 2.8 1.6.1.3.2.5.2.8z" />
    </svg>
  ),
  tidal: (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M12 4.8 8 8.8l4 4-4 4-4-4 4-4-4-4 4-4 4 4zm4 0-4 4 4 4 4-4-4-4z" />
    </svg>
  ),
  deezer: (
    <svg {...ICON_PROPS} fill="currentColor">
      <rect x="0" y="18" width="4" height="3" />
      <rect x="5" y="18" width="4" height="3" />
      <rect x="5" y="14" width="4" height="3" />
      <rect x="10" y="18" width="4" height="3" />
      <rect x="10" y="14" width="4" height="3" />
      <rect x="10" y="10" width="4" height="3" />
      <rect x="15" y="18" width="4" height="3" />
      <rect x="15" y="14" width="4" height="3" />
      <rect x="15" y="10" width="4" height="3" />
      <rect x="15" y="6" width="4" height="3" />
      <rect x="20" y="18" width="4" height="3" />
      <rect x="20" y="14" width="4" height="3" />
      <rect x="20" y="10" width="4" height="3" />
      <rect x="20" y="6" width="4" height="3" />
      <rect x="20" y="2" width="4" height="3" />
    </svg>
  ),
  amazonMusic: (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M17.7 14.3c-4.3 3.2-10.5 4.9-15.8 4.9-1.1 0-2.2-.1-3.3-.3-.2 0-.3.2-.1.3C2.3 22 6.5 23.5 11 23.5c3.3 0 7.1-1.1 9.7-3.1.4-.3.1-.9-.4-.6l-.6.5zM20.9 13c-.3-.4-2-.5-3.1-.3-.3 0-.3.3 0 .3.9.3 2.8.9 3.1.4.3-.3-.1-2.3-1.6-3.8-.2-.2-.4-.1-.3.2.4 1.1.8 2.8.5 3.2h-.6z" />
      <path d="M15.5 11.8V4.5c0-.5-.2-.8-.6-.8-1.8 0-4.3 2.3-4.3 5v3.7c0 .4-.2.7-.5.8L8.4 14c-.3.1-.5.4-.5.8v.7c0 .2.1.3.3.3l4.3-1.3c.3-.1.5-.4.5-.8v-.1l-.5.1c-.3.1-.5-.1-.5-.4V11c0-1.7 1.1-3.2 2.4-3.6v5.5c0 .3.2.5.5.4l2.2-.7c.3-.1.5-.4.5-.8v-.7c0-.2-.1-.3-.3-.3l-2 .6v.4h-.5z" />
    </svg>
  ),
  soundcloud: (
    <svg {...ICON_PROPS} fill="currentColor">
      <path d="M1.2 14.3c-.1 0-.2-.1-.2-.2l-.3-2.4.3-2.5c0-.1.1-.2.2-.2s.2.1.2.2l.4 2.5-.4 2.4c0 .1-.1.2-.2.2zm1.9.7c-.1 0-.2-.1-.2-.2L2.5 12l.4-3.6c0-.1.1-.2.3-.2.1 0 .2.1.2.2l.3 3.6-.3 2.8c0 .1-.1.2-.3.2zm2 .1c-.1 0-.3-.1-.3-.3l-.3-2.8.3-4.1c0-.2.1-.3.3-.3s.3.1.3.3l.3 4.1-.3 2.8c0 .2-.2.3-.3.3zm2-.1c-.2 0-.3-.1-.3-.3L6.5 12l.3-5.2c0-.2.2-.3.3-.3.2 0 .3.1.3.3l.3 5.2-.3 3.4c0 .2-.1.3-.3.3h0zm2 0c-.2 0-.3-.2-.4-.4L8.4 12l.3-5.6c0-.2.2-.4.4-.4s.3.2.4.4l.3 5.6-.3 3.2c0 .2-.2.4-.4.4h-.1zm2 .1c-.2 0-.4-.2-.4-.4l-.2-2.8.2-5.9c0-.3.2-.4.4-.4.3 0 .4.2.4.4l.3 5.9-.3 2.8c0 .2-.2.4-.4.4zm2.1-.1c-.3 0-.5-.2-.5-.5l-.2-2.6.2-6.1c0-.3.2-.5.5-.5.2 0 .4.2.5.5l.2 6.1-.2 2.6c0 .3-.3.5-.5.5zm5.3-.1H15c-.3 0-.5-.2-.5-.5V5.7c0-.2.1-.4.3-.5.5-.2 1.1-.3 1.7-.3 3.1 0 5.5 2.5 5.5 5.5s-2.5 5.5-5.5 5.5h-.5z" />
    </svg>
  ),
};

/** Display order, labels, and brand hex colors for known platforms */
const PLATFORM_CONFIG: Record<string, { label: string; hex: string }> = {
  spotify: { label: 'Spotify', hex: '#1DB954' },
  youtubeMusic: { label: 'YT Music', hex: '#FF0000' },
  youtube: { label: 'YouTube', hex: '#FF0000' },
  appleMusic: { label: 'Apple Music', hex: '#FA243C' },
  tidal: { label: 'Tidal', hex: '#AAAAAA' },
  deezer: { label: 'Deezer', hex: '#A238FF' },
  amazonMusic: { label: 'Amazon', hex: '#FF9900' },
  soundcloud: { label: 'SoundCloud', hex: '#FF5500' },
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
        const icon = PLATFORM_ICONS[link.platform];

        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80"
            style={{
              color: config.hex,
              borderColor: `${config.hex}33`,
              backgroundColor: `${config.hex}1a`,
            }}
          >
            {icon}
            {config.label}
          </a>
        );
      })}
    </div>
  );
}
