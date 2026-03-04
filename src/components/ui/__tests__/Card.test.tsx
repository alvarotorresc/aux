// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Card } from '../Card';

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Hello world</Card>);

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    render(<Card className="custom-class">Content</Card>);

    const card = screen.getByText('Content');
    expect(card.className).toContain('custom-class');
  });

  it('should render without className prop', () => {
    render(<Card>No class</Card>);

    const card = screen.getByText('No class');
    // Should have base classes but no trailing extra class — no undefined/null in class string
    expect(card.className).toContain('rounded-lg');
    expect(card.className).not.toContain('undefined');
    expect(card.className).not.toContain('null');
  });
});
