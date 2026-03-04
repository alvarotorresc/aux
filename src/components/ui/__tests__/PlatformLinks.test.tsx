// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PlatformLinks } from '../PlatformLinks';

describe('PlatformLinks', () => {
  // --- Sorting by priority ---

  it('should render links sorted by platform priority', () => {
    const links = [
      { platform: 'youtube', url: 'https://youtube.com/watch?v=abc' },
      { platform: 'spotify', url: 'https://open.spotify.com/track/abc' },
      { platform: 'appleMusic', url: 'https://music.apple.com/track/abc' },
    ];

    render(<PlatformLinks links={links} />);

    const anchors = screen.getAllByRole('link');
    expect(anchors[0]).toHaveTextContent('Spotify');
    expect(anchors[1]).toHaveTextContent('YouTube');
    expect(anchors[2]).toHaveTextContent('Apple Music');
  });

  it('should render all known platforms in correct order', () => {
    const links = [
      { platform: 'soundcloud', url: 'https://soundcloud.com/test' },
      { platform: 'deezer', url: 'https://deezer.com/track/123' },
      { platform: 'tidal', url: 'https://tidal.com/track/123' },
      { platform: 'youtubeMusic', url: 'https://music.youtube.com/watch?v=abc' },
      { platform: 'spotify', url: 'https://open.spotify.com/track/abc' },
    ];

    render(<PlatformLinks links={links} />);

    const anchors = screen.getAllByRole('link');
    expect(anchors[0]).toHaveTextContent('Spotify');
    expect(anchors[1]).toHaveTextContent('YT Music');
    expect(anchors[2]).toHaveTextContent('Tidal');
    expect(anchors[3]).toHaveTextContent('Deezer');
    expect(anchors[4]).toHaveTextContent('SoundCloud');
  });

  // --- Filtering non-https URLs ---

  it('should filter out non-https URLs', () => {
    const links = [
      { platform: 'spotify', url: 'https://open.spotify.com/track/abc' },
      { platform: 'youtube', url: 'http://youtube.com/watch?v=abc' },
    ];

    render(<PlatformLinks links={links} />);

    const anchors = screen.getAllByRole('link');
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toHaveTextContent('Spotify');
  });

  it('should filter out invalid URLs', () => {
    const links = [
      { platform: 'spotify', url: 'https://open.spotify.com/track/abc' },
      { platform: 'youtube', url: 'not-a-valid-url' },
    ];

    render(<PlatformLinks links={links} />);

    const anchors = screen.getAllByRole('link');
    expect(anchors).toHaveLength(1);
  });

  // --- Correct icons ---

  it('should render SVG icons for each platform link', () => {
    const links = [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }];

    const { container } = render(<PlatformLinks links={links} />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
  });

  it('should set correct href on links', () => {
    const links = [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }];

    render(<PlatformLinks links={links} />);

    const anchor = screen.getByRole('link');
    expect(anchor).toHaveAttribute('href', 'https://open.spotify.com/track/abc');
  });

  it('should set rel=noopener on external links', () => {
    const links = [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }];

    render(<PlatformLinks links={links} />);

    const anchor = screen.getByRole('link');
    expect(anchor).toHaveAttribute('rel', 'noopener');
  });

  // --- Unknown platform ---

  it('should not render links for unknown platforms', () => {
    const links = [{ platform: 'unknownPlatform', url: 'https://unknown.com/track/abc' }];

    const { container } = render(<PlatformLinks links={links} />);

    const anchors = screen.queryAllByRole('link');
    expect(anchors).toHaveLength(0);
    // Container should still render the wrapper div
    expect(container.querySelector('.flex')).toBeInTheDocument();
  });

  it('should render known platforms and skip unknown ones', () => {
    const links = [
      { platform: 'spotify', url: 'https://open.spotify.com/track/abc' },
      { platform: 'unknownPlatform', url: 'https://unknown.com/track/abc' },
      { platform: 'youtube', url: 'https://youtube.com/watch?v=abc' },
    ];

    render(<PlatformLinks links={links} />);

    const anchors = screen.getAllByRole('link');
    expect(anchors).toHaveLength(2);
  });

  // --- Empty and null links ---

  it('should return null when links array is empty', () => {
    const { container } = render(<PlatformLinks links={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('should return null when links is null-ish', () => {
    // Component checks `!links`, so passing null/undefined should render nothing
    // TypeScript prevents direct null, but at runtime it could happen
    const { container } = render(<PlatformLinks links={null as unknown as []} />);

    expect(container.innerHTML).toBe('');
  });

  it('should return null when all links have invalid URLs', () => {
    const links = [
      { platform: 'spotify', url: 'http://not-https.com' },
      { platform: 'youtube', url: 'ftp://bad-protocol.com' },
    ];

    const { container } = render(<PlatformLinks links={links} />);

    expect(container.innerHTML).toBe('');
  });

  // --- Brand colors ---

  it('should apply platform brand color as inline style', () => {
    const links = [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }];

    render(<PlatformLinks links={links} />);

    const anchor = screen.getByRole('link');
    expect(anchor.style.color).toBe('rgb(29, 185, 84)'); // #1DB954
  });

  // --- Platform labels ---

  it('should display correct label for each platform', () => {
    const links = [{ platform: 'amazonMusic', url: 'https://music.amazon.com/track/abc' }];

    render(<PlatformLinks links={links} />);

    expect(screen.getByText('Amazon')).toBeInTheDocument();
  });
});
