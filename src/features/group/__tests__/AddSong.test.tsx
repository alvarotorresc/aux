// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddSong } from '../AddSong';
import type { ResolvedSong } from '../../../lib/odesli';

const mockResolveSongLink = vi.fn();
vi.mock('../../../lib/odesli', () => ({
  resolveSongLink: (...args: unknown[]) => mockResolveSongLink(...args),
}));

function makeResolved(overrides: Partial<ResolvedSong> = {}): ResolvedSong {
  return {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    album: 'A Night at the Opera',
    genre: 'rock',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    platformLinks: [{ platform: 'spotify', url: 'https://open.spotify.com/track/abc' }],
    pageUrl: 'https://song.link/bohemian',
    ...overrides,
  };
}

describe('AddSong', () => {
  let mockOnAddSong: ReturnType<
    typeof vi.fn<(url: string, genre: string | null, preResolved: ResolvedSong) => Promise<void>>
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAddSong =
      vi.fn<(url: string, genre: string | null, preResolved: ResolvedSong) => Promise<void>>();
  });

  // --- Step 1: URL input ---

  it('should render input and submit button', () => {
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    expect(screen.getByPlaceholderText('Paste a Spotify or YouTube link...')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDefined();
  });

  it('should disable submit button when input is empty', () => {
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const button = screen.getByRole('button', { name: 'Add' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('should enable submit button when input has value', () => {
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const button = screen.getByRole('button', { name: 'Add' });
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('should not call onAddSong when input is only whitespace', () => {
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: '   ' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(mockResolveSongLink).not.toHaveBeenCalled();
    expect(mockOnAddSong).not.toHaveBeenCalled();
  });

  it('should show "Resolving..." button text while resolving URL', async () => {
    mockResolveSongLink.mockReturnValue(new Promise(() => {}));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Resolving...' })).toBeDefined();
    });
  });

  it('should disable input while resolving', async () => {
    mockResolveSongLink.mockReturnValue(new Promise(() => {}));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText(
      'Paste a Spotify or YouTube link...',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(input.disabled).toBe(true);
    });
  });

  it('should show error when resolution fails', async () => {
    mockResolveSongLink.mockRejectedValue(new Error('Song not found'));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/bad' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe('Song not found');
    });
  });

  it('should show "Unknown error" when resolution rejects with non-Error', async () => {
    mockResolveSongLink.mockRejectedValue('string error');
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe('Unknown error');
    });
  });

  it('should clear error when input value changes after error', async () => {
    mockResolveSongLink.mockRejectedValue(new Error('fail'));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    fireEvent.change(input, { target: { value: 'new value' } });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  // --- Step 2: Preview + confirm ---

  it('should show preview after successful resolution', async () => {
    const resolved = makeResolved();
    mockResolveSongLink.mockResolvedValue(resolved);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Bohemian Rhapsody')).toBeDefined();
      expect(screen.getByText('Queen')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('should pre-fill genre dropdown with detected genre', async () => {
    mockResolveSongLink.mockResolvedValue(makeResolved({ genre: 'jazz' }));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: 'Genre' }) as HTMLSelectElement;
      expect(select.value).toBe('jazz');
    });
  });

  it('should leave genre dropdown empty when no genre detected', async () => {
    mockResolveSongLink.mockResolvedValue(makeResolved({ genre: null }));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: 'Genre' }) as HTMLSelectElement;
      expect(select.value).toBe('');
    });
  });

  it('should call onAddSong with resolved data and genre on confirm', async () => {
    const resolved = makeResolved({ genre: 'rock' });
    mockResolveSongLink.mockResolvedValue(resolved);
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockOnAddSong).toHaveBeenCalledWith(
        'https://open.spotify.com/track/abc',
        'rock',
        resolved,
      );
    });
  });

  it('should allow changing genre before confirming', async () => {
    mockResolveSongLink.mockResolvedValue(makeResolved({ genre: 'rock' }));
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Genre' })).toBeDefined();
    });

    const select = screen.getByRole('combobox', { name: 'Genre' });
    fireEvent.change(select, { target: { value: 'jazz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockOnAddSong).toHaveBeenCalledWith(
        'https://open.spotify.com/track/abc',
        'jazz',
        expect.anything(),
      );
    });
  });

  it('should pass null genre when no genre selected on confirm', async () => {
    mockResolveSongLink.mockResolvedValue(makeResolved({ genre: null }));
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockOnAddSong).toHaveBeenCalledWith(
        'https://open.spotify.com/track/abc',
        null,
        expect.anything(),
      );
    });
  });

  it('should reset to idle state after successful confirmation', async () => {
    mockResolveSongLink.mockResolvedValue(makeResolved());
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      const urlInput = screen.getByPlaceholderText(
        'Paste a Spotify or YouTube link...',
      ) as HTMLInputElement;
      expect(urlInput.value).toBe('');
    });
  });

  it('should go back to URL input when cancel is clicked', async () => {
    mockResolveSongLink.mockResolvedValue(makeResolved());
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByPlaceholderText('Paste a Spotify or YouTube link...')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDefined();
  });

  it('should show error when onAddSong fails during confirmation', async () => {
    mockResolveSongLink.mockResolvedValue(makeResolved());
    mockOnAddSong.mockRejectedValue(new Error('This song has already been added to this round'));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe('This song has already been added to this round');
    });
  });

  it('should show thumbnail in preview when available', async () => {
    mockResolveSongLink.mockResolvedValue(
      makeResolved({ thumbnailUrl: 'https://example.com/thumb.jpg' }),
    );
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      const img = document.querySelector('img[src="https://example.com/thumb.jpg"]');
      expect(img).not.toBeNull();
    });
  });

  it('should not render genre select in step 1', () => {
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
