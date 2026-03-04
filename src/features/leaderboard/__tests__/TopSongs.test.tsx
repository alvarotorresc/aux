// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TopSongs } from '../TopSongs';
import type { AllTimeSong } from '../useLeaderboard';

function makeSong(overrides: Partial<AllTimeSong> = {}): AllTimeSong {
  return {
    id: 's1',
    title: 'Test Song',
    artist: 'Test Artist',
    thumbnail_url: null,
    memberName: 'Alice',
    avgRating: 4.5,
    totalVotes: 5,
    roundNumber: 1,
    ...overrides,
  };
}

const fiveSongs: AllTimeSong[] = [
  makeSong({ id: 's1', title: 'Gold Song', memberName: 'Alice', avgRating: 4.9, roundNumber: 3 }),
  makeSong({ id: 's2', title: 'Silver Song', memberName: 'Bob', avgRating: 4.7, roundNumber: 2 }),
  makeSong({ id: 's3', title: 'Bronze Song', memberName: 'Carol', avgRating: 4.5, roundNumber: 1 }),
  makeSong({ id: 's4', title: 'Fourth Song', memberName: 'Dave', avgRating: 4.2, roundNumber: 4 }),
  makeSong({ id: 's5', title: 'Fifth Song', memberName: 'Eve', avgRating: 3.8, roundNumber: 5 }),
];

describe('TopSongs', () => {
  it('should render empty state when songs array is empty', () => {
    render(<TopSongs songs={[]} locale="en" />);
    expect(screen.getByText('No rated songs yet')).toBeInTheDocument();
  });

  it('should render section heading', () => {
    render(<TopSongs songs={fiveSongs} locale="en" />);
    expect(screen.getByText('Top 5 songs of all time')).toBeInTheDocument();
  });

  it('should render all song titles', () => {
    render(<TopSongs songs={fiveSongs} locale="en" />);

    expect(screen.getByText('Gold Song')).toBeInTheDocument();
    expect(screen.getByText('Silver Song')).toBeInTheDocument();
    expect(screen.getByText('Bronze Song')).toBeInTheDocument();
    expect(screen.getByText('Fourth Song')).toBeInTheDocument();
    expect(screen.getByText('Fifth Song')).toBeInTheDocument();
  });

  it('should show medal emojis for top 3 positions', () => {
    render(<TopSongs songs={fiveSongs} locale="en" />);

    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('should show numeric position for 4th and 5th places', () => {
    render(<TopSongs songs={fiveSongs} locale="en" />);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display member name and round number for each song', () => {
    render(<TopSongs songs={fiveSongs} locale="en" />);

    expect(screen.getByText(/by Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Round 3/)).toBeInTheDocument();
    expect(screen.getByText(/by Bob/)).toBeInTheDocument();
    expect(screen.getByText(/Round 2/)).toBeInTheDocument();
    expect(screen.getByText(/by Eve/)).toBeInTheDocument();
    expect(screen.getByText(/Round 5/)).toBeInTheDocument();
  });

  it('should display average ratings formatted to one decimal', () => {
    render(<TopSongs songs={fiveSongs} locale="en" />);

    expect(screen.getByText('4.9')).toBeInTheDocument();
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('3.8')).toBeInTheDocument();
  });

  it('should render thumbnail image when URL is valid HTTPS', () => {
    const songs = [makeSong({ thumbnail_url: 'https://example.com/thumb.jpg' })];
    const { container } = render(<TopSongs songs={songs} locale="en" />);

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('should not render thumbnail image when URL is HTTP (not HTTPS)', () => {
    const songs = [makeSong({ thumbnail_url: 'http://example.com/thumb.jpg' })];
    const { container } = render(<TopSongs songs={songs} locale="en" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should not render thumbnail image when URL is null', () => {
    const songs = [makeSong({ thumbnail_url: null })];
    const { container } = render(<TopSongs songs={songs} locale="en" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should not render thumbnail when URL is malformed', () => {
    const songs = [makeSong({ thumbnail_url: 'not-a-url' })];
    const { container } = render(<TopSongs songs={songs} locale="en" />);

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('should render placeholder icon when no valid thumbnail', () => {
    const songs = [makeSong({ thumbnail_url: null })];
    const { container } = render(<TopSongs songs={songs} locale="en" />);

    // The placeholder is an SVG with aria-hidden
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).toBeInTheDocument();
  });

  it('should render in Spanish locale', () => {
    render(<TopSongs songs={[]} locale="es" />);
    expect(screen.getByText('Aun no hay canciones puntuadas')).toBeInTheDocument();
  });

  it('should render a single song correctly', () => {
    const songs = [makeSong({ title: 'Only Song', memberName: 'Solo', roundNumber: 7 })];
    render(<TopSongs songs={songs} locale="en" />);

    expect(screen.getByText('Only Song')).toBeInTheDocument();
    expect(screen.getByText(/by Solo/)).toBeInTheDocument();
    expect(screen.getByText(/Round 7/)).toBeInTheDocument();
    expect(screen.getByText('🥇')).toBeInTheDocument();
  });
});
