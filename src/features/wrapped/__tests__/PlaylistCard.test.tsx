// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PlaylistCard } from '../PlaylistCard';
import type { WrappedSong } from '../../../lib/wrapped';

// --- Mock Button ---

vi.mock('../../../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// --- Helpers ---

function makeSong(overrides: Partial<WrappedSong> = {}): WrappedSong {
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

const spotifySong = makeSong({
  id: 's1',
  title: 'Spotify Track',
  artist: 'Spotify Artist',
  platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }],
});

const ytSong = makeSong({
  id: 's2',
  title: 'YT Track',
  artist: 'YT Artist',
  platform_links: [{ platform: 'youtubeMusic', url: 'https://music.youtube.com/watch?v=xyz' }],
});

const bothSong = makeSong({
  id: 's3',
  title: 'Both Track',
  artist: 'Both Artist',
  platform_links: [
    { platform: 'spotify', url: 'https://open.spotify.com/track/both' },
    { platform: 'youtube', url: 'https://youtube.com/watch?v=both' },
  ],
});

// --- Tests ---

describe('PlaylistCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders playlist title', () => {
    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    expect(screen.getByText('Playlist')).toBeInTheDocument();
  });

  it('renders platform tabs', () => {
    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    expect(screen.getByText('Spotify')).toBeInTheDocument();
    expect(screen.getByText('YT Music')).toBeInTheDocument();
  });

  it('defaults to Spotify tab', () => {
    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    const spotifyTab = screen.getByRole('tab', { name: 'Spotify' });
    expect(spotifyTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows Spotify songs on Spotify tab', () => {
    render(<PlaylistCard songs={[spotifySong, ytSong]} locale="en" />);
    expect(screen.getByText('Spotify Track')).toBeInTheDocument();
    expect(screen.queryByText('YT Track')).not.toBeInTheDocument();
  });

  it('shows YouTube songs when YT Music tab is clicked', () => {
    render(<PlaylistCard songs={[spotifySong, ytSong]} locale="en" />);
    fireEvent.click(screen.getByText('YT Music'));
    expect(screen.getByText('YT Track')).toBeInTheDocument();
    expect(screen.queryByText('Spotify Track')).not.toBeInTheDocument();
  });

  it('shows songs with both platforms in both tabs', () => {
    render(<PlaylistCard songs={[bothSong]} locale="en" />);
    expect(screen.getByText('Both Track')).toBeInTheDocument();

    fireEvent.click(screen.getByText('YT Music'));
    expect(screen.getByText('Both Track')).toBeInTheDocument();
  });

  it('shows empty state when no links for selected platform', () => {
    render(<PlaylistCard songs={[ytSong]} locale="en" />);
    // Default is Spotify, ytSong has no Spotify link
    expect(screen.getByText('No links available for this platform')).toBeInTheDocument();
  });

  it('shows "Open songs" button for Spotify', () => {
    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    expect(screen.getByText('Open songs')).toBeInTheDocument();
  });

  it('shows "Open playlist" button for YouTube Music', () => {
    render(<PlaylistCard songs={[ytSong]} locale="en" />);
    fireEvent.click(screen.getByText('YT Music'));
    expect(screen.getByText('Open playlist')).toBeInTheDocument();
  });

  it('shows "Copy links" button', () => {
    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    expect(screen.getByText('Copy links')).toBeInTheDocument();
  });

  it('shows copied feedback after clicking copy', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    fireEvent.click(screen.getByText('Copy links'));

    await waitFor(() => {
      expect(screen.getByText('Links copied!')).toBeInTheDocument();
    });
  });

  it('renders Spanish locale labels', () => {
    render(<PlaylistCard songs={[ytSong]} locale="es" />);
    // Empty state in Spanish (Spotify tab, no Spotify songs)
    expect(screen.getByText('No hay enlaces para esta plataforma')).toBeInTheDocument();
  });

  it('shows numbered list of songs', () => {
    const songs = [
      makeSong({
        id: 's1',
        title: 'First',
        artist: 'A1',
        platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/1' }],
      }),
      makeSong({
        id: 's2',
        title: 'Second',
        artist: 'A2',
        platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/2' }],
      }),
    ];
    render(<PlaylistCard songs={songs} locale="en" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('opens YouTube playlist URL in new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PlaylistCard songs={[ytSong]} locale="en" />);
    fireEvent.click(screen.getByText('YT Music'));
    fireEvent.click(screen.getByText('Open playlist'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.youtube.com/watch_videos?video_ids=xyz',
      '_blank',
      'noopener',
    );
  });

  it('opens Spotify links in new tabs (max 5)', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    fireEvent.click(screen.getByText('Open songs'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://open.spotify.com/track/abc',
      '_blank',
      'noopener',
    );
  });

  it('caps Spotify opens at 5 tabs', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const manySongs = Array.from({ length: 7 }, (_, i) =>
      makeSong({
        id: `s${i}`,
        title: `Song ${i}`,
        artist: `Artist ${i}`,
        platform_links: [{ platform: 'spotify', url: `https://open.spotify.com/track/${i}` }],
      }),
    );
    render(<PlaylistCard songs={manySongs} locale="en" />);
    fireEvent.click(screen.getByText('Open songs'));
    expect(openSpy).toHaveBeenCalledTimes(5);
  });

  it('should not call window.open when YouTube playlist URL is null', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    // Song has youtubeMusic platform (passes hasPlatformLink filter) but URL is
    // invalid so extractYouTubeVideoIds returns [] -> buildYouTubePlaylistUrl returns null
    const invalidYtSong = makeSong({
      id: 'invalid-yt',
      title: 'Invalid YT',
      artist: 'Artist',
      platform_links: [{ platform: 'youtubeMusic', url: 'not-a-url' }],
    });

    render(<PlaylistCard songs={[invalidYtSong]} locale="en" />);
    fireEvent.click(screen.getByText('YT Music'));
    fireEvent.click(screen.getByText('Open playlist'));

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should not write to clipboard when formatPlaylistForClipboard returns empty', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

    // Use a song whose platform_links pass hasPlatformLink (has 'spotify') but where
    // the URL is empty so formatPlaylistForClipboard produces a line with no URL.
    // Actually, formatPlaylistForClipboard always produces non-empty for matching links.
    // The only way to get empty text: mock the module.
    // Since vi.mock is already set up, we can use the spy on the already-mocked module.

    // We use a song with an empty platform_links array that somehow passes
    // the hasPlatformLink filter -- not possible with the real function.
    // So we use vi.mock at the module level. However, this would affect ALL tests.
    // Instead, use vi.spyOn with the module object:
    const playlist = await import('../../../lib/playlist');
    const spy = vi.spyOn(playlist, 'formatPlaylistForClipboard').mockReturnValue('');

    render(<PlaylistCard songs={[spotifySong]} locale="en" />);
    fireEvent.click(screen.getByText('Copy links'));

    // With empty text, clipboard.writeText should NOT be called (early return on line 38)
    expect(writeTextSpy).not.toHaveBeenCalled();
    // And "Links copied!" should NOT appear
    expect(screen.queryByText('Links copied!')).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it('resets copied state when switching tabs', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<PlaylistCard songs={[spotifySong, ytSong]} locale="en" />);
    fireEvent.click(screen.getByText('Copy links'));

    await waitFor(() => {
      expect(screen.getByText('Links copied!')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('YT Music'));
    expect(screen.queryByText('Links copied!')).not.toBeInTheDocument();
    expect(screen.getByText('Copy links')).toBeInTheDocument();
  });
});
