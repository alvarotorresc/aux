// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GenreBadge } from '../GenreBadge';

describe('GenreBadge', () => {
  it('should render the genre label', () => {
    render(<GenreBadge genre="rock" />);
    expect(screen.getByText('Rock')).toBeInTheDocument();
  });

  it('should apply genre-specific color classes', () => {
    const { container } = render(<GenreBadge genre="rock" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('bg-red-500/15');
    expect(badge.className).toContain('text-red-400');
  });

  it('should render nothing when genre is null', () => {
    const { container } = render(<GenreBadge genre={null} />);
    expect(container.firstElementChild).toBeNull();
  });

  it('should apply fallback color for unknown genre', () => {
    const { container } = render(<GenreBadge genre="unknown-genre" />);
    const badge = container.firstElementChild!;
    expect(badge.className).toContain('bg-neutral-500/15');
    expect(badge.className).toContain('text-neutral-400');
  });

  it('should render unknown genre string as-is for label', () => {
    render(<GenreBadge genre="unknown-genre" />);
    expect(screen.getByText('unknown-genre')).toBeInTheDocument();
  });
});
