interface EmojiPickerProps {
  selected: string;
  onSelect: (emoji: string) => void;
  label: string;
}

const MUSIC_EMOJIS = [
  '\u{1F3B5}', // musical note
  '\u{1F3B8}', // guitar
  '\u{1F3A4}', // microphone
  '\u{1F941}', // drum
  '\u{1F3B9}', // musical keyboard
  '\u{1F3A7}', // headphone
  '\u{1F3BA}', // trumpet
  '\u{1F3BB}', // violin
  '\u{1F3B6}', // musical notes
  '\u{1F3BC}', // musical score
  '\u{1F3B7}', // saxophone
  '\u{1FA97}', // accordion
  '\u{1FA98}', // long drum
  '\u{1FA87}', // maracas
  '\u{1F50A}', // speaker high volume
  '\u{1F4FB}', // radio
] as const;

export function EmojiPicker({ selected, onSelect, label }: EmojiPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-text-secondary">{label}</legend>
      <div className="grid grid-cols-8 gap-2" role="radiogroup" aria-label={label}>
        {MUSIC_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={selected === emoji}
            aria-label={emoji}
            onClick={() => onSelect(emoji)}
            className={`flex h-10 w-10 items-center justify-center rounded-md text-xl transition-colors cursor-pointer ${
              selected === emoji
                ? 'bg-primary/20 ring-2 ring-primary'
                : 'bg-bg-input hover:bg-border'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export { MUSIC_EMOJIS };
