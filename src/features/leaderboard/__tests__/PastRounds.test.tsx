// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { PastRounds } from '../PastRounds';
import type { PastRound } from '../useLeaderboard';

const mockRounds: PastRound[] = [
  {
    number: 1,
    winner: 'Alice',
    topSong: 'Bohemian Rhapsody',
    topArtist: 'Queen',
    topGenre: 'rock',
    topScore: 4.5,
  },
  {
    number: 2,
    winner: 'Bob',
    topSong: 'So What',
    topArtist: 'Miles Davis',
    topGenre: 'jazz',
    topScore: 3.8,
  },
  {
    number: 3,
    winner: 'Carol',
    topSong: 'No Genre Song',
    topArtist: 'Unknown',
    topGenre: null,
    topScore: 4.0,
  },
];

describe('PastRounds', () => {
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
});
