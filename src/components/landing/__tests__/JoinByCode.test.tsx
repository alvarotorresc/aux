// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinByCode } from '../JoinByCode';

vi.mock('../../../i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'hero.joinPlaceholder': 'Enter group code',
      'hero.joinLink': 'Join',
    };
    return translations[key] ?? key;
  },
}));

const mockBuildJoinUrl = vi.fn();
vi.mock('../../../lib/join-by-code', () => ({
  buildJoinUrl: (...args: unknown[]) => mockBuildJoinUrl(...args),
}));

describe('JoinByCode', () => {
  beforeEach(() => {
    mockBuildJoinUrl.mockReset();
    // Mock window.location.href as a writable property
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
  });

  it('should render an input with placeholder', () => {
    render(<JoinByCode locale="en" />);

    const input = screen.getByPlaceholderText('Enter group code');
    expect(input).toBeDefined();
  });

  it('should render a submit button', () => {
    render(<JoinByCode locale="en" />);

    const button = screen.getByRole('button', { name: 'Join' });
    expect(button).toBeDefined();
  });

  it('should have button disabled when input is empty', () => {
    render(<JoinByCode locale="en" />);

    const button = screen.getByRole('button', { name: 'Join' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('should enable button when input has text', async () => {
    const user = userEvent.setup();
    render(<JoinByCode locale="en" />);

    const input = screen.getByPlaceholderText('Enter group code');
    await user.type(input, 'my-group');

    const button = screen.getByRole('button', { name: 'Join' });
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('should keep button disabled when input is only whitespace', async () => {
    const user = userEvent.setup();
    render(<JoinByCode locale="en" />);

    const input = screen.getByPlaceholderText('Enter group code');
    await user.type(input, '   ');

    const button = screen.getByRole('button', { name: 'Join' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('should call buildJoinUrl and navigate on submit', async () => {
    mockBuildJoinUrl.mockReturnValue('/g/cool-group');
    const user = userEvent.setup();

    render(<JoinByCode locale="en" />);

    const input = screen.getByPlaceholderText('Enter group code');
    await user.type(input, 'cool-group');

    const button = screen.getByRole('button', { name: 'Join' });
    fireEvent.click(button);

    expect(mockBuildJoinUrl).toHaveBeenCalledWith('cool-group', 'en');
    expect(window.location.href).toBe('/g/cool-group');
  });

  it('should not navigate when buildJoinUrl returns null', async () => {
    mockBuildJoinUrl.mockReturnValue(null);
    const user = userEvent.setup();

    render(<JoinByCode locale="en" />);

    const input = screen.getByPlaceholderText('Enter group code');
    await user.type(input, 'x');

    const button = screen.getByRole('button', { name: 'Join' });
    fireEvent.click(button);

    expect(mockBuildJoinUrl).toHaveBeenCalled();
    expect(window.location.href).toBe('');
  });

  it('should pass locale to buildJoinUrl', async () => {
    mockBuildJoinUrl.mockReturnValue('/es/g/grupo');
    const user = userEvent.setup();

    render(<JoinByCode locale="es" />);

    const input = screen.getByPlaceholderText('Enter group code');
    await user.type(input, 'grupo');

    const button = screen.getByRole('button', { name: 'Join' });
    fireEvent.click(button);

    expect(mockBuildJoinUrl).toHaveBeenCalledWith('grupo', 'es');
  });
});
