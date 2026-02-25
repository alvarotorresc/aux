import { useState } from 'react';
import type { Locale } from '../../../site.config';
import { t } from '../../i18n';
import { Button } from '../../components/ui/Button';

interface AddSongProps {
  onAddSong: (url: string) => Promise<void>;
  locale: Locale;
}

type AddSongState = 'idle' | 'resolving' | 'error';

/**
 * Input to add a song by pasting a Spotify/YouTube/music URL.
 * Resolves via Odesli and calls onAddSong on success.
 */
export function AddSong({ onAddSong, locale }: AddSongProps) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<AddSongState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setState('resolving');
    setErrorMessage('');

    try {
      await onAddSong(trimmed);
      // Success: clear the input
      setUrl('');
      setState('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      setState('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2 rounded-xl border border-dashed border-border bg-bg-card p-4">
        <label htmlFor="add-song-url" className="sr-only">
          {t('group.addSong.placeholder', locale)}
        </label>
        <input
          id="add-song-url"
          type="url"
          placeholder={t('group.addSong.placeholder', locale)}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (state === 'error') {
              setState('idle');
              setErrorMessage('');
            }
          }}
          disabled={state === 'resolving'}
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg-input px-3.5 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <Button type="submit" size="sm" disabled={state === 'resolving' || !url.trim()}>
          {state === 'resolving'
            ? t('group.addSong.resolving', locale)
            : t('group.addSong.button', locale)}
        </Button>
      </div>

      {state === 'error' && errorMessage && (
        <p role="alert" className="px-1 text-sm text-error">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
