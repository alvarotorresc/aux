// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmojiPicker, MUSIC_EMOJIS } from '../EmojiPicker';

describe('EmojiPicker', () => {
  it('should render all 16 music emojis', () => {
    render(<EmojiPicker selected="" onSelect={() => {}} label="Pick your avatar" />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(16);
  });

  it('should render the legend with the provided label', () => {
    render(<EmojiPicker selected="" onSelect={() => {}} label="Pick your avatar" />);

    expect(screen.getByText('Pick your avatar')).toBeDefined();
  });

  it('should call onSelect with the clicked emoji', () => {
    const onSelect = vi.fn();
    render(<EmojiPicker selected="" onSelect={onSelect} label="Pick" />);

    const guitarButton = screen.getByLabelText(MUSIC_EMOJIS[1]); // guitar emoji
    fireEvent.click(guitarButton);

    expect(onSelect).toHaveBeenCalledWith(MUSIC_EMOJIS[1]);
  });

  it('should mark selected emoji with aria-checked true', () => {
    const selectedEmoji = MUSIC_EMOJIS[2]; // microphone
    render(<EmojiPicker selected={selectedEmoji} onSelect={() => {}} label="Pick" />);

    const selectedButton = screen.getByLabelText(selectedEmoji);
    expect(selectedButton.getAttribute('aria-checked')).toBe('true');
  });

  it('should mark non-selected emojis with aria-checked false', () => {
    const selectedEmoji = MUSIC_EMOJIS[0]; // musical note
    render(<EmojiPicker selected={selectedEmoji} onSelect={() => {}} label="Pick" />);

    const otherButton = screen.getByLabelText(MUSIC_EMOJIS[3]); // drum
    expect(otherButton.getAttribute('aria-checked')).toBe('false');
  });

  it('should render a radiogroup with the label as aria-label', () => {
    render(<EmojiPicker selected="" onSelect={() => {}} label="Pick your avatar" />);

    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup.getAttribute('aria-label')).toBe('Pick your avatar');
  });

  it('should render a fieldset element', () => {
    const { container } = render(<EmojiPicker selected="" onSelect={() => {}} label="Pick" />);

    const fieldset = container.querySelector('fieldset');
    expect(fieldset).not.toBeNull();
  });

  it('should render each emoji as a button with type button', () => {
    render(<EmojiPicker selected="" onSelect={() => {}} label="Pick" />);

    const radios = screen.getAllByRole('radio');
    for (const radio of radios) {
      expect(radio.getAttribute('type')).toBe('button');
    }
  });

  it('should have no emoji selected initially when selected is empty string', () => {
    render(<EmojiPicker selected="" onSelect={() => {}} label="Pick" />);

    const radios = screen.getAllByRole('radio');
    const checkedRadios = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
    expect(checkedRadios).toHaveLength(0);
  });

  it('should call onSelect for each different emoji clicked', () => {
    const onSelect = vi.fn();
    render(<EmojiPicker selected="" onSelect={onSelect} label="Pick" />);

    fireEvent.click(screen.getByLabelText(MUSIC_EMOJIS[0]));
    fireEvent.click(screen.getByLabelText(MUSIC_EMOJIS[5]));

    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, MUSIC_EMOJIS[0]);
    expect(onSelect).toHaveBeenNthCalledWith(2, MUSIC_EMOJIS[5]);
  });
});
