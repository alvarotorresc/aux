// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SongCard } from '../SongCard';
import type { Member, SongWithVotes, Vote } from '../../../lib/types';

// --- Factories ---

function makeSong(overrides: Partial<SongWithVotes> = {}): SongWithVotes {
  return {
    id: 'song-1',
    round_id: 'round-1',
    member_id: 'member-1',
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    thumbnail_url: 'https://i.scdn.co/image/abc',
    platform_links: [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }],
    odesli_page_url: 'https://song.link/s/abc',
    created_at: '2026-01-01T00:00:00Z',
    votes: [],
    avgRating: 0,
    totalVotes: 0,
    ...overrides,
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    group_id: 'group-1',
    name: 'Alice',
    avatar: '🎵',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: 'vote-1',
    song_id: 'song-1',
    member_id: 'member-2',
    rating: 4,
    created_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

const defaultProps = {
  memberId: 'member-2',
  members: [makeMember({ id: 'member-1', name: 'Alice' })],
  onRate: vi.fn(),
  locale: 'en' as const,
};

describe('SongCard', () => {
  it('should render song title and artist', () => {
    render(<SongCard song={makeSong()} {...defaultProps} />);

    expect(screen.getByText('Bohemian Rhapsody')).toBeDefined();
    expect(screen.getByText('Queen')).toBeDefined();
  });

  it('should display who added the song', () => {
    render(<SongCard song={makeSong()} {...defaultProps} />);

    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('should display "?" when song author is not in members list', () => {
    const song = makeSong({ member_id: 'unknown-member' });
    render(<SongCard song={song} {...defaultProps} />);

    expect(screen.getByText('?')).toBeDefined();
  });

  it('should render album art when thumbnail_url is valid HTTPS', () => {
    render(<SongCard song={makeSong()} {...defaultProps} />);

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://i.scdn.co/image/abc');
  });

  it('should not render img when thumbnail_url is null', () => {
    const song = makeSong({ thumbnail_url: null });
    render(<SongCard song={song} {...defaultProps} />);

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should not render img when thumbnail_url uses HTTP', () => {
    const song = makeSong({ thumbnail_url: 'http://insecure.com/image.jpg' });
    render(<SongCard song={song} {...defaultProps} />);

    // The safeThumbUrl function should strip non-https URLs
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('should show "Your track" when song belongs to current member', () => {
    const song = makeSong({ member_id: 'member-2' });
    render(<SongCard song={song} {...defaultProps} memberId="member-2" />);

    expect(screen.getByText('Your track')).toBeDefined();
  });

  it('should show star rating when song does not belong to current member', () => {
    const song = makeSong({ member_id: 'member-1' });
    render(<SongCard song={song} {...defaultProps} memberId="member-2" />);

    // Should show interactive star rating (radiogroup)
    expect(screen.getByRole('radiogroup')).toBeDefined();
  });

  it('should not show interactive stars when song belongs to current member', () => {
    const song = makeSong({ member_id: 'member-2' });
    render(<SongCard song={song} {...defaultProps} memberId="member-2" />);

    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('should display average rating', () => {
    const song = makeSong({ avgRating: 3.5, totalVotes: 4 });
    render(<SongCard song={song} {...defaultProps} />);

    expect(screen.getByText('3.5')).toBeDefined();
    expect(screen.getByText('(4)')).toBeDefined();
  });

  it('should display the current user vote rating when they have voted', () => {
    const vote = makeVote({ member_id: 'member-2', rating: 4.5 });
    const song = makeSong({
      votes: [vote],
      avgRating: 4.5,
      totalVotes: 1,
    });
    render(<SongCard song={song} {...defaultProps} memberId="member-2" />);

    // Both the user's rating and the group average show "4.5"
    const elements = screen.getAllByText('4.5');
    expect(elements).toHaveLength(2);
  });

  it('should render platform links', () => {
    const song = makeSong({
      platform_links: [
        { platform: 'spotify', url: 'https://open.spotify.com/track/abc' },
        { platform: 'youtubeMusic', url: 'https://music.youtube.com/watch?v=abc' },
      ],
    });
    render(<SongCard song={song} {...defaultProps} />);

    expect(screen.getByText('Spotify')).toBeDefined();
    expect(screen.getByText('YT Music')).toBeDefined();
  });

  it('should render album cover alt text with album name when available', () => {
    const song = makeSong({ album: 'A Night at the Opera' });
    render(<SongCard song={song} {...defaultProps} />);

    const img = screen.getByRole('img');
    expect(img.getAttribute('alt')).toBe('A Night at the Opera cover');
  });

  it('should use title in alt text when album is null', () => {
    const song = makeSong({ album: null });
    render(<SongCard song={song} {...defaultProps} />);

    const img = screen.getByRole('img');
    expect(img.getAttribute('alt')).toBe('Bohemian Rhapsody cover');
  });
});
