// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyGroups } from '../MyGroups';

vi.mock('../../../i18n', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'hero.myGroups': 'Your groups',
    };
    return translations[key] ?? key;
  },
}));

const mockGetMyGroups = vi.fn();
vi.mock('../../../lib/storage', () => ({
  getMyGroups: () => mockGetMyGroups(),
}));

describe('MyGroups', () => {
  beforeEach(() => {
    mockGetMyGroups.mockReset();
  });

  it('should render nothing when no groups exist', () => {
    mockGetMyGroups.mockReturnValue([]);

    const { container } = render(<MyGroups locale="en" />);

    expect(container.innerHTML).toBe('');
  });

  it('should render group links when groups exist', () => {
    mockGetMyGroups.mockReturnValue([
      { slug: 'cool-music', name: 'Cool Music Club' },
      { slug: 'rock-fans', name: 'Rock Fans' },
    ]);

    render(<MyGroups locale="en" />);

    expect(screen.getByText('Cool Music Club')).toBeDefined();
    expect(screen.getByText('Rock Fans')).toBeDefined();
  });

  it('should display group slug alongside name', () => {
    mockGetMyGroups.mockReturnValue([{ slug: 'cool-music', name: 'Cool Music Club' }]);

    render(<MyGroups locale="en" />);

    expect(screen.getByText('cool-music')).toBeDefined();
  });

  it('should link to correct URL with EN locale (no prefix)', () => {
    mockGetMyGroups.mockReturnValue([{ slug: 'my-group', name: 'My Group' }]);

    render(<MyGroups locale="en" />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/g/my-group');
  });

  it('should link to correct URL with ES locale (/es prefix)', () => {
    mockGetMyGroups.mockReturnValue([{ slug: 'mi-grupo', name: 'Mi Grupo' }]);

    render(<MyGroups locale="es" />);

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/es/g/mi-grupo');
  });

  it('should render the section heading', () => {
    mockGetMyGroups.mockReturnValue([{ slug: 'test', name: 'Test' }]);

    render(<MyGroups locale="en" />);

    expect(screen.getByText('Your groups')).toBeDefined();
  });

  it('should render multiple group links', () => {
    mockGetMyGroups.mockReturnValue([
      { slug: 'group-a', name: 'Group A' },
      { slug: 'group-b', name: 'Group B' },
      { slug: 'group-c', name: 'Group C' },
    ]);

    render(<MyGroups locale="en" />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
  });
});
