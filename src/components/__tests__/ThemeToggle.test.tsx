// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  let mockClassList: { contains: ReturnType<typeof vi.fn>; toggle: ReturnType<typeof vi.fn> };
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockClassList = {
      contains: vi.fn().mockReturnValue(false),
      toggle: vi.fn(),
    };

    Object.defineProperty(document.documentElement, 'classList', {
      value: mockClassList,
      configurable: true,
    });

    const mockLocalStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    };

    vi.stubGlobal('localStorage', mockLocalStorage);
    mockStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render a button', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('should have aria-label for switching to light mode when in dark mode', () => {
    mockClassList.contains.mockReturnValue(false); // no 'light' class = dark mode

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
  });

  it('should have aria-label for switching to dark mode when in light mode', () => {
    mockClassList.contains.mockReturnValue(true); // has 'light' class = light mode

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
  });

  it('should toggle to light mode when clicked from dark mode', () => {
    mockClassList.contains.mockReturnValue(false); // dark mode

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');
  });

  it('should toggle to dark mode when clicked from light mode', () => {
    mockClassList.contains.mockReturnValue(true); // light mode

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
  });

  it('should update localStorage on toggle', () => {
    mockClassList.contains.mockReturnValue(false); // dark mode

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockStorage.get('aux-theme')).toBe('light');
  });

  it('should toggle documentElement classList on click', () => {
    mockClassList.contains.mockReturnValue(false); // dark mode

    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockClassList.toggle).toHaveBeenCalledWith('light', true);
  });

  it('should render an SVG icon inside the button', () => {
    const { container } = render(<ThemeToggle />);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });
});
