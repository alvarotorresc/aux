// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AddSong } from '../AddSong';

const VALID_URL = 'https://open.spotify.com/track/123';

function renderAddSong(onAddSong = vi.fn<(url: string, genre: string | null) => Promise<void>>()) {
  const result = render(<AddSong onAddSong={onAddSong} locale="en" />);
  return { ...result, onAddSong };
}

describe('AddSong', () => {
  it('should render URL input and submit button', () => {
    renderAddSong();

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render a genre select dropdown', () => {
    renderAddSong();

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Should have genre options plus the empty placeholder
    const options = screen.getAllByRole('option');
    // 19 genres + 1 placeholder = 20
    expect(options.length).toBe(20);
  });

  it('should disable submit when URL is empty', () => {
    renderAddSong();

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should call onAddSong with URL and null genre when none selected', async () => {
    const user = userEvent.setup();
    const { onAddSong } = renderAddSong(vi.fn().mockResolvedValue(undefined));

    await user.type(screen.getByRole('textbox'), VALID_URL);
    await user.click(screen.getByRole('button'));

    expect(onAddSong).toHaveBeenCalledWith(VALID_URL, null);
  });

  it('should call onAddSong with URL and selected genre', async () => {
    const user = userEvent.setup();
    const { onAddSong } = renderAddSong(vi.fn().mockResolvedValue(undefined));

    await user.type(screen.getByRole('textbox'), VALID_URL);
    await user.selectOptions(screen.getByRole('combobox'), 'rock');
    await user.click(screen.getByRole('button'));

    expect(onAddSong).toHaveBeenCalledWith(VALID_URL, 'rock');
  });

  it('should reset genre after successful submission', async () => {
    const user = userEvent.setup();
    renderAddSong(vi.fn().mockResolvedValue(undefined));

    await user.type(screen.getByRole('textbox'), VALID_URL);
    await user.selectOptions(screen.getByRole('combobox'), 'rock');
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('');
    });
  });

  it('should clear URL input after successful submission', async () => {
    const user = userEvent.setup();
    renderAddSong(vi.fn().mockResolvedValue(undefined));

    await user.type(screen.getByRole('textbox'), VALID_URL);
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('');
    });
  });

  it('should show error message when onAddSong fails', async () => {
    const user = userEvent.setup();
    renderAddSong(vi.fn().mockRejectedValue(new Error('Resolve failed')));

    await user.type(screen.getByRole('textbox'), VALID_URL);
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Resolve failed');
    });
  });

  it('should disable inputs while resolving', async () => {
    const user = userEvent.setup();
    // Never-resolving promise to keep the resolving state
    const onAddSong = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<AddSong onAddSong={onAddSong} locale="en" />);

    await user.type(screen.getByRole('textbox'), VALID_URL);
    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });
});
