// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
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

  // --- Hover state preview ---

  it('should preview rating on hover over right half of star', () => {
    const { container } = render(<StarRating rating={1} onRate={() => {}} />);

    // Hover over "4 stars" (right half of 4th star)
    const button = screen.getByLabelText('4 stars');
    fireEvent.mouseEnter(button);

    // After hover, aria-label should still reflect the base rating (it's static),
    // but the filled polygons should change. Check that 4 stars worth of polygons
    // have the fill-star class (not clip-pathed).
    // Stars 1-4 should be fully filled, star 5 should not
    const filledPolygons = container.querySelectorAll('polygon.fill-star');
    expect(filledPolygons.length).toBe(4);
  });

  it('should preview half-star rating on hover over left half', () => {
    const { container } = render(<StarRating rating={0} onRate={() => {}} />);

    // Hover over "2.5 stars" (left half of 3rd star)
    const button = screen.getByLabelText('2.5 stars');
    fireEvent.mouseEnter(button);

    // Stars 1-2 should be fully filled, star 3 should be half-filled
    const filledPolygons = container.querySelectorAll('polygon.fill-star');
    // 2 fully filled + 1 half-filled = 3 polygons with fill-star class
    expect(filledPolygons.length).toBe(3);

    // The half-filled one should have clipPath
    const halfFilledPolygons = container.querySelectorAll('polygon.fill-star[clip-path]');
    expect(halfFilledPolygons.length).toBe(1);
  });

  it('should reset hover preview when mouse leaves the component', () => {
    const { container } = render(<StarRating rating={2} onRate={() => {}} />);

    // Hover to change display
    const button = screen.getByLabelText('5 stars');
    fireEvent.mouseEnter(button);

    // Mouse leave the container
    const ratingContainer = screen.getByRole('radiogroup');
    fireEvent.mouseLeave(ratingContainer);

    // Should revert to original rating of 2
    const filledPolygons = container.querySelectorAll('polygon.fill-star:not([clip-path])');
    expect(filledPolygons.length).toBe(2);
  });

  // --- Half-star rendering ---

  it('should render half-filled star for 2.5 rating', () => {
    const { container } = render(<StarRating rating={2.5} />);

    // Stars 1-2 fully filled, star 3 half-filled
    const allFilledPolygons = container.querySelectorAll('polygon.fill-star');
    expect(allFilledPolygons.length).toBe(3); // 2 full + 1 half

    const halfFilledPolygons = container.querySelectorAll('polygon.fill-star[clip-path]');
    expect(halfFilledPolygons.length).toBe(1);
  });

  it('should render no filled stars for rating 0', () => {
    const { container } = render(<StarRating rating={0} />);

    const filledPolygons = container.querySelectorAll('polygon.fill-star');
    expect(filledPolygons.length).toBe(0);
  });

  it('should render all filled stars for rating 5', () => {
    const { container } = render(<StarRating rating={5} />);

    const filledPolygons = container.querySelectorAll('polygon.fill-star');
    expect(filledPolygons.length).toBe(5);

    // None should be half-filled
    const halfFilledPolygons = container.querySelectorAll('polygon.fill-star[clip-path]');
    expect(halfFilledPolygons.length).toBe(0);
  });

  // --- Read-only mode ---

  it('should use cursor-default class in read-only mode', () => {
    render(<StarRating rating={3} />);

    const container = screen.getByRole('img');
    expect(container.className).toContain('cursor-default');
  });

  it('should use cursor-pointer class in interactive mode', () => {
    render(<StarRating rating={3} onRate={() => {}} />);

    const container = screen.getByRole('radiogroup');
    expect(container.className).toContain('cursor-pointer');
  });

  // --- Custom size ---

  it('should accept custom size prop', () => {
    const { container } = render(<StarRating rating={3} size={30} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '30');
    expect(svg).toHaveAttribute('height', '30');
  });
});
