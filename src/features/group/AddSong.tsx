import { useState } from 'react';
import type { Locale } from '../../../site.config';
import { t } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import { GENRES, getGenreLabel } from '../../lib/genres';
import { resolveSongLink } from '../../lib/odesli';
import type { ResolvedSong } from '../../lib/odesli';
import { Button } from '../../components/ui/Button';
import { GenreBadge } from '../../components/ui/GenreBadge';

interface AddSongProps {
  onAddSong: (url: string, genre: string | null, preResolved: ResolvedSong) => Promise<void>;
  locale: Locale;
}

type AddSongState = 'idle' | 'resolving' | 'preview' | 'adding' | 'error';

/**
 * Two-step song submission:
 * 1. Paste URL → resolve via Odesli (auto-detects genre via Last.fm)
 * 2. Preview song info + confirm/change genre → add to round
 */
export function AddSong({ onAddSong, locale }: AddSongProps) {
  const [url, setUrl] = useState('');
  const [genre, setGenre] = useState<string>('');
  const [state, setState] = useState<AddSongState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resolved, setResolved] = useState<ResolvedSong | null>(null);

  async function handleResolve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setState('resolving');
    setErrorMessage('');

    try {
      const result = await resolveSongLink(trimmed);
      setResolved(result);
      setGenre(result.genre ?? '');
      setState('preview');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      setState('error');
    }
  }

  async function handleConfirm() {
    if (!resolved) return;

    setState('adding');
    setErrorMessage('');

    try {
      await onAddSong(url.trim(), genre || null, resolved);
      setUrl('');
      setGenre('');
      setResolved(null);
      setState('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      setState('error');
    }
  }

  function handleCancel() {
    setResolved(null);
    setGenre('');
    setErrorMessage('');
    setState('idle');
  }

  const isResolving = state === 'resolving';
  const isAdding = state === 'adding';
  const isBusy = isResolving || isAdding;

  // Step 2: Preview + confirm
  if (state === 'preview' && resolved) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-card p-4">
          <div className="flex items-center gap-3">
            {resolved.thumbnailUrl && (
              <img
                src={resolved.thumbnailUrl}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{resolved.title}</p>
              <p className="truncate text-xs text-text-secondary">{resolved.artist}</p>
            </div>
            {resolved.genre && <GenreBadge genre={resolved.genre} />}
          </div>
          <div className="flex gap-2">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              aria-label={t('group.addSong.genreLabel' as TranslationKey, locale)}
              className="flex-1 rounded-lg border border-border bg-bg-input px-3 py-2.5 text-sm text-text"
            >
              <option value="">
                {t('group.addSong.genrePlaceholder' as TranslationKey, locale)}
              </option>
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {getGenreLabel(g)}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={handleConfirm}>
              {t('group.addSong.confirm' as TranslationKey, locale)}
            </Button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:text-text"
            >
              {t('group.addSong.cancel' as TranslationKey, locale)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: URL input + resolve
  return (
    <form onSubmit={handleResolve} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-bg-card p-4">
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
          disabled={isBusy}
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg-input px-3.5 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <Button type="submit" size="sm" disabled={isBusy || !url.trim()}>
          {isResolving ? t('group.addSong.resolving', locale) : t('group.addSong.button', locale)}
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
