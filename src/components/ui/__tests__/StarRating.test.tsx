// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarRating } from '../StarRating';

describe('StarRating', () => {
  // --- Read-only display ---

  it('should render with img role when not interactive', () => {
    render(<StarRating rating={3} />);

    const container = screen.getByRole('img');
    expect(container).toBeDefined();
  });

  it('should display rating in aria-label', () => {
    render(<StarRating rating={3.5} />);

    const container = screen.getByRole('img');
    expect(container.getAttribute('aria-label')).toBe('Rating: 3.5 out of 5 stars');
  });

  it('should display 0 rating when rating is null', () => {
    render(<StarRating rating={null} />);

    const container = screen.getByRole('img');
    expect(container.getAttribute('aria-label')).toBe('Rating: 0 out of 5 stars');
  });

  it('should not render interactive buttons when onRate is not provided', () => {
    render(<StarRating rating={3} />);

    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  // --- Interactive mode ---

  it('should render with radiogroup role when interactive', () => {
    render(<StarRating rating={3} onRate={() => {}} />);

    const container = screen.getByRole('radiogroup');
    expect(container).toBeDefined();
  });

  it('should render 10 interactive buttons when onRate is provided', () => {
    render(<StarRating rating={3} onRate={() => {}} />);

    // 5 stars x 2 halves = 10 buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(10);
  });

  it('should call onRate with full star value when right half is clicked', () => {
    const onRate = vi.fn();
    render(<StarRating rating={null} onRate={onRate} />);

    // "3 stars" button is the right half of the 3rd star
    const button = screen.getByLabelText('3 stars');
    fireEvent.click(button);

    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('should call onRate with half star value when left half is clicked', () => {
    const onRate = vi.fn();
    render(<StarRating rating={null} onRate={onRate} />);

    // "2.5 stars" button is the left half of the 3rd star
    const button = screen.getByLabelText('2.5 stars');
    fireEvent.click(button);

    expect(onRate).toHaveBeenCalledWith(2.5);
  });

  it('should call onRate with 0.5 when left half of first star is clicked', () => {
    const onRate = vi.fn();
    render(<StarRating rating={null} onRate={onRate} />);

    const button = screen.getByLabelText('0.5 stars');
    fireEvent.click(button);

    expect(onRate).toHaveBeenCalledWith(0.5);
  });

  it('should call onRate with 5 when right half of last star is clicked', () => {
    const onRate = vi.fn();
    render(<StarRating rating={null} onRate={onRate} />);

    const button = screen.getByLabelText('5 stars');
    fireEvent.click(button);

    expect(onRate).toHaveBeenCalledWith(5);
  });

  it('should have accessible labels for all half-star increments', () => {
    render(<StarRating rating={null} onRate={() => {}} />);

    const expectedLabels = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    for (const label of expectedLabels) {
      expect(screen.getByLabelText(`${label} stars`)).toBeDefined();
    }
  });

  // --- SVG rendering ---

  it('should render exactly 5 star SVGs', () => {
    const { container } = render(<StarRating rating={3} />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(5);
  });
});
