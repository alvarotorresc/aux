// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddSong } from '../AddSong';

describe('AddSong', () => {
  let mockOnAddSong: ReturnType<typeof vi.fn<(url: string, genre: string | null) => Promise<void>>>;

  beforeEach(() => {
    mockOnAddSong = vi.fn<(url: string, genre: string | null) => Promise<void>>();
  });

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

  it('should call onAddSong with trimmed URL and null genre on submit', async () => {
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: '  https://open.spotify.com/track/abc  ' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnAddSong).toHaveBeenCalledWith('https://open.spotify.com/track/abc', null);
    });
  });

  it('should clear input on successful submission', async () => {
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText(
      'Paste a Spotify or YouTube link...',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('should show error message when onAddSong rejects', async () => {
    mockOnAddSong.mockRejectedValue(new Error('Song not found'));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/notfound' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toBe('Song not found');
    });
  });

  it('should show "Unknown error" when onAddSong rejects with non-Error', async () => {
    mockOnAddSong.mockRejectedValue('string error');
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

  it('should show "Resolving..." button text while submitting', async () => {
    // Never resolve so we can see the loading state
    mockOnAddSong.mockReturnValue(new Promise(() => {}));
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
    mockOnAddSong.mockReturnValue(new Promise(() => {}));
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

  it('should clear error when input value changes after error', async () => {
    mockOnAddSong.mockRejectedValue(new Error('fail'));
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    // Change input to clear error
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('should not call onAddSong when input is only whitespace', () => {
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: '   ' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(mockOnAddSong).not.toHaveBeenCalled();
  });

  it('should render genre select dropdown', () => {
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const select = screen.getByRole('combobox', { name: 'Genre (optional)' });
    expect(select).toBeDefined();
  });

  it('should call onAddSong with selected genre on submit', async () => {
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const select = screen.getByRole('combobox', { name: 'Genre (optional)' });
    fireEvent.change(select, { target: { value: 'rock' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnAddSong).toHaveBeenCalledWith('https://open.spotify.com/track/abc', 'rock');
    });
  });

  it('should reset genre select after successful submission', async () => {
    mockOnAddSong.mockResolvedValue(undefined);
    render(<AddSong onAddSong={mockOnAddSong} locale="en" />);

    const input = screen.getByPlaceholderText('Paste a Spotify or YouTube link...');
    fireEvent.change(input, { target: { value: 'https://open.spotify.com/track/abc' } });

    const select = screen.getByRole('combobox', { name: 'Genre (optional)' }) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'rock' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(select.value).toBe('');
    });
  });
});
