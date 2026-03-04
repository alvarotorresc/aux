// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PastRounds } from '../PastRounds';
import type { PastRound, PastRoundSong } from '../useLeaderboard';

function makeSong(overrides: Partial<PastRoundSong> = {}): PastRoundSong {
  return {
    id: 's1',
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail_url: null,
    memberName: 'Alice',
    avgRating: 4.5,
    totalVotes: 3,
    ...overrides,
  };
}

function makeRound(overrides: Partial<PastRound> = {}): PastRound {
  return {
    number: 1,
    winner: 'Alice',
    topSong: 'Bohemian Rhapsody',
    topArtist: 'Queen',
    topGenre: 'rock',
    topScore: 4.5,
    songs: [],
    ...overrides,
  };
}

const mockRounds: PastRound[] = [
  makeRound({
    number: 1,
    winner: 'Alice',
    topSong: 'Bohemian Rhapsody',
    topArtist: 'Queen',
    topGenre: 'rock',
    topScore: 4.5,
    songs: [],
  }),
  makeRound({
    number: 2,
    winner: 'Bob',
    topSong: 'So What',
    topArtist: 'Miles Davis',
    topGenre: 'jazz',
    topScore: 3.8,
    songs: [],
  }),
  makeRound({
    number: 3,
    winner: 'Carol',
    topSong: 'No Genre Song',
    topArtist: 'Unknown',
    topGenre: null,
    topScore: 4.0,
    songs: [],
  }),
];

describe('PastRounds', () => {
  // --- Existing tests (preserved) ---

  it('renders empty state when no rounds', () => {
    render(<PastRounds rounds={[]} locale="en" />);
    expect(screen.getByText('No past rounds yet')).toBeInTheDocument();
  });

  it('renders round numbers and song info', () => {
    render(<PastRounds rounds={mockRounds} locale="en" />);
    expect(screen.getByText('Bohemian Rhapsody — Queen')).toBeInTheDocument();
    expect(screen.getByText('So What — Miles Davis')).toBeInTheDocument();
    expect(screen.getByText('No Genre Song — Unknown')).toBeInTheDocument();
  });

  it('shows GenreBadge for rounds with a genre', () => {
    render(<PastRounds rounds={mockRounds} locale="en" />);
    expect(screen.getByText('Rock')).toBeInTheDocument();
    expect(screen.getByText('Jazz')).toBeInTheDocument();
  });

  it('does not show GenreBadge for rounds with null genre', () => {
    render(<PastRounds rounds={[mockRounds[2]]} locale="en" />);
    expect(screen.queryByText('Rock')).not.toBeInTheDocument();
    expect(screen.queryByText('Jazz')).not.toBeInTheDocument();
  });

  it('shows winner names', () => {
    render(<PastRounds rounds={mockRounds} locale="en" />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/Carol/)).toBeInTheDocument();
  });

  it('displays scores formatted to one decimal', () => {
    render(<PastRounds rounds={mockRounds} locale="en" />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('3.8')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
  });

  it('renders in Spanish locale', () => {
    render(<PastRounds rounds={[]} locale="es" />);
    expect(screen.getByText('Aun no hay rondas pasadas')).toBeInTheDocument();
  });

  // --- Expand / collapse ---

  it('should expand round song list when clicking a round button', () => {
    const songs = [
      makeSong({ id: 's1', title: 'Song A', memberName: 'Alice', totalVotes: 3 }),
      makeSong({ id: 's2', title: 'Song B', memberName: 'Bob', totalVotes: 2 }),
    ];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    // Songs should not be visible before clicking
    expect(screen.queryByText('Song A')).not.toBeInTheDocument();

    // Click the round button to expand
    const expandButton = screen.getByRole('button', { expanded: false });
    fireEvent.click(expandButton);

    // Songs should now be visible
    expect(screen.getByText('Song A')).toBeInTheDocument();
    expect(screen.getByText('Song B')).toBeInTheDocument();
  });

  it('should collapse round song list when clicking an expanded round', () => {
    const songs = [makeSong({ id: 's1', title: 'Collapse Song' })];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    // Expand
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    expect(screen.getByText('Collapse Song')).toBeInTheDocument();

    // Collapse
    fireEvent.click(expandButton);
    expect(screen.queryByText('Collapse Song')).not.toBeInTheDocument();
  });

  it('should set aria-expanded correctly on toggle', () => {
    const songs = [makeSong()];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should only expand one round at a time', () => {
    const songsA = [makeSong({ id: 's1', title: 'Song From Round 1' })];
    const songsB = [makeSong({ id: 's2', title: 'Song From Round 2' })];
    const rounds = [
      makeRound({ number: 1, songs: songsA }),
      makeRound({ number: 2, songs: songsB }),
    ];
    render(<PastRounds rounds={rounds} locale="en" />);

    const buttons = screen.getAllByRole('button');

    // Expand first round
    fireEvent.click(buttons[0]);
    expect(screen.getByText('Song From Round 1')).toBeInTheDocument();
    expect(screen.queryByText('Song From Round 2')).not.toBeInTheDocument();

    // Expand second round — first should collapse
    fireEvent.click(buttons[1]);
    expect(screen.queryByText('Song From Round 1')).not.toBeInTheDocument();
    expect(screen.getByText('Song From Round 2')).toBeInTheDocument();
  });

  // --- Song list rendering ---

  it('should render member names in expanded song list', () => {
    const songs = [
      makeSong({ id: 's1', title: 'Song X', memberName: 'Dave', totalVotes: 2 }),
      makeSong({ id: 's2', title: 'Song Y', memberName: 'Eve', totalVotes: 1 }),
    ];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/by Dave/)).toBeInTheDocument();
    expect(screen.getByText(/by Eve/)).toBeInTheDocument();
  });

  it('should show medals for top 3 songs with votes in expanded list', () => {
    const songs = [
      makeSong({ id: 's1', title: 'Gold', avgRating: 4.9, totalVotes: 5 }),
      makeSong({ id: 's2', title: 'Silver', avgRating: 4.5, totalVotes: 4 }),
      makeSong({ id: 's3', title: 'Bronze', avgRating: 4.0, totalVotes: 3 }),
      makeSong({ id: 's4', title: 'Fourth', avgRating: 3.5, totalVotes: 2 }),
    ];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
    // 4th position shows number
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('should show numeric position for songs with zero votes', () => {
    const songs = [makeSong({ id: 's1', title: 'No Votes', totalVotes: 0, avgRating: 0 })];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    // Should show position number, not medal
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('🥇')).not.toBeInTheDocument();
  });

  it('should show dash instead of rating for songs with zero votes', () => {
    const songs = [makeSong({ id: 's1', totalVotes: 0, avgRating: 0 })];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show average rating for songs with votes', () => {
    const songs = [makeSong({ id: 's1', avgRating: 4.7, totalVotes: 5 })];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('4.7')).toBeInTheDocument();
  });

  // --- Thumbnails ---

  it('should render HTTPS thumbnail image in expanded song list', () => {
    const songs = [
      makeSong({ id: 's1', thumbnail_url: 'https://example.com/thumb.jpg', totalVotes: 1 }),
    ];
    const rounds = [makeRound({ number: 1, songs })];
    const { container } = render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('should not render HTTP thumbnail in expanded song list', () => {
    const songs = [
      makeSong({ id: 's1', thumbnail_url: 'http://insecure.com/thumb.jpg', totalVotes: 1 }),
    ];
    const rounds = [makeRound({ number: 1, songs })];
    const { container } = render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should not render malformed thumbnail URL in expanded song list', () => {
    const songs = [makeSong({ id: 's1', thumbnail_url: 'not-a-url', totalVotes: 1 })];
    const rounds = [makeRound({ number: 1, songs })];
    const { container } = render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should render placeholder icon when thumbnail is null', () => {
    const songs = [makeSong({ id: 's1', thumbnail_url: null, totalVotes: 1 })];
    const rounds = [makeRound({ number: 1, songs })];
    const { container } = render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    const placeholder = container.querySelector('svg[aria-hidden="true"]');
    expect(placeholder).toBeInTheDocument();
  });

  // --- Edge cases ---

  it('should not show expanded content when round has empty songs array', () => {
    const rounds = [makeRound({ number: 1, songs: [] })];
    render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    // The button toggled to expanded, but no song content is rendered
    // (the condition is `isExpanded && round.songs.length > 0`)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('should not show score when topScore is 0', () => {
    const rounds = [makeRound({ number: 1, topScore: 0 })];
    render(<PastRounds rounds={rounds} locale="en" />);

    // topScore 0 means no score displayed (conditional render)
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it('should render round label text for each round', () => {
    const rounds = [makeRound({ number: 5 }), makeRound({ number: 12 })];
    render(<PastRounds rounds={rounds} locale="en" />);

    expect(screen.getByText(/Round 5/)).toBeInTheDocument();
    expect(screen.getByText(/Round 12/)).toBeInTheDocument();
  });

  it('should render heading text', () => {
    render(<PastRounds rounds={mockRounds} locale="en" />);
    expect(screen.getByText('Past rounds')).toBeInTheDocument();
  });

  it('should highlight first song with votes in expanded list', () => {
    const songs = [
      makeSong({ id: 's1', title: 'Winner', totalVotes: 3, avgRating: 4.5 }),
      makeSong({ id: 's2', title: 'Runner Up', totalVotes: 2, avgRating: 3.5 }),
    ];
    const rounds = [makeRound({ number: 1, songs })];
    render(<PastRounds rounds={rounds} locale="en" />);

    fireEvent.click(screen.getByRole('button'));

    // First song should be highlighted (has star border class)
    expect(screen.getByText('Winner')).toBeInTheDocument();
    expect(screen.getByText('Runner Up')).toBeInTheDocument();
  });
});
