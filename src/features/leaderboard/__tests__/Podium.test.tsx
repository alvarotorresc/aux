// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Podium } from '../Podium';
import type { MemberStats } from '../../../lib/types';

function makeMember(overrides: Partial<MemberStats> = {}): MemberStats {
  return {
    id: 'm1',
    group_id: 'g1',
    name: 'Alice',
    avatar: '🎵',
    is_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    totalScore: 42.5,
    songsAdded: 5,
    avgReceived: 4.2,
    roundsWon: 3,
    ...overrides,
  };
}

const first = makeMember({ id: 'm1', name: 'Alice', avatar: '🎵', totalScore: 42.5 });
const second = makeMember({ id: 'm2', name: 'Bob', avatar: '🎸', totalScore: 35.0 });
const third = makeMember({ id: 'm3', name: 'Carol', avatar: '🥁', totalScore: 28.3 });

describe('Podium', () => {
  it('should render null when members array is empty', () => {
    const { container } = render(<Podium members={[]} locale="en" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render only 1st place when a single member is provided', () => {
    render(<Podium members={[first]} locale="en" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('42.5 pts')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol')).not.toBeInTheDocument();
  });

  it('should render 1st and 2nd place when two members are provided', () => {
    render(<Podium members={[first, second]} locale="en" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Carol')).not.toBeInTheDocument();
  });

  it('should render all three members when three are provided', () => {
    render(<Podium members={[first, second, third]} locale="en" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('should display scores formatted to one decimal place', () => {
    render(<Podium members={[first, second, third]} locale="en" />);

    expect(screen.getByText('42.5 pts')).toBeInTheDocument();
    expect(screen.getByText('35.0 pts')).toBeInTheDocument();
    expect(screen.getByText('28.3 pts')).toBeInTheDocument();
  });

  it('should set aria-label on avatar elements with member names', () => {
    render(<Podium members={[first, second, third]} locale="en" />);

    expect(screen.getByRole('img', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bob' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Carol' })).toBeInTheDocument();
  });

  it('should display medal emojis for all three positions', () => {
    render(<Podium members={[first, second, third]} locale="en" />);

    // Gold, silver, bronze medals are rendered with aria-hidden
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('should render avatars inside their containers', () => {
    render(<Podium members={[first, second, third]} locale="en" />);

    // Avatar emoji should appear inside role=img elements
    const aliceAvatar = screen.getByRole('img', { name: 'Alice' });
    expect(aliceAvatar).toHaveTextContent('🎵');
    const bobAvatar = screen.getByRole('img', { name: 'Bob' });
    expect(bobAvatar).toHaveTextContent('🎸');
    const carolAvatar = screen.getByRole('img', { name: 'Carol' });
    expect(carolAvatar).toHaveTextContent('🥁');
  });

  it('should have accessible section with aria-label', () => {
    render(<Podium members={[first]} locale="en" />);

    const section = screen.getByRole('region', { name: 'Leaderboard' });
    expect(section).toBeInTheDocument();
  });

  it('should render in Spanish locale with translated labels', () => {
    render(<Podium members={[first]} locale="es" />);

    expect(screen.getByText(/pts/)).toBeInTheDocument();
  });
});
