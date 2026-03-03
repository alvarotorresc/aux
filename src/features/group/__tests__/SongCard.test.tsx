// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SongCard } from '../SongCard';
import type { Member, SongWithVotes } from '../../../lib/types';

const defaultMembers: Member[] = [
  {
    id: 'member-1',
    group_id: 'group-1',
    name: 'Alice',
    avatar: 'A',
    is_admin: false,
    created_at: '2024-01-01T00:00:00Z',
  },
];

function makeSong(overrides: Partial<SongWithVotes> = {}): SongWithVotes {
  return {
    id: 'song-1',
    round_id: 'round-1',
    member_id: 'member-1',
    title: 'Test Song',
    artist: 'Test Artist',
    album: null,
    thumbnail_url: null,
    platform_links: [],
    odesli_page_url: null,
    genre: null,
    created_at: '2024-01-01T00:00:00Z',
    votes: [],
    avgRating: 0,
    totalVotes: 0,
    ...overrides,
  };
}

const defaultProps = {
  memberId: 'member-2',
  members: defaultMembers,
  onRate: vi.fn(),
  locale: 'en' as const,
};

describe('SongCard', () => {
  it('should display genre badge when song has a genre', () => {
    const song = makeSong({ genre: 'rock' });
    render(<SongCard song={song} {...defaultProps} />);
    expect(screen.getByText('Rock')).toBeDefined();
  });

  it('should not display genre badge when song genre is null', () => {
    const song = makeSong({ genre: null });
    render(<SongCard song={song} {...defaultProps} />);
    // Verify no genre label appears - check against known genre labels
    expect(screen.queryByText('Rock')).toBeNull();
    expect(screen.queryByText('Pop')).toBeNull();
    expect(screen.queryByText('Jazz')).toBeNull();
  });
});
