import type { Locale } from '../../../site.config';
import type { AllTimeSong } from './useLeaderboard';
import { t } from '../../i18n';

interface TopSongsProps {
  songs: AllTimeSong[];
  locale: Locale;
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'] as const;

function safeThumbUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Top 5 songs of all time (completed rounds), sorted by average rating.
 */
export function TopSongs({ songs, locale }: TopSongsProps) {
  return (
    <section className="px-5 pb-6">
      <h3 className="mb-3 text-base font-semibold text-text">
        {t('leaderboard.topSongs', locale)}
      </h3>

      {songs.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('leaderboard.noTopSongs', locale)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {songs.map((song, i) => {
            const thumbUrl = safeThumbUrl(song.thumbnail_url);
            const isFirst = i === 0;
            return (
              <div
                key={song.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isFirst ? 'border-star/30 bg-star/[0.08]' : 'border-border bg-bg-card'
                }`}
              >
                {/* Position */}
                <span className="w-7 shrink-0 text-center text-lg">
                  {i < 3 ? (
                    MEDALS[i]
                  ) : (
                    <span className="font-mono text-sm text-text-tertiary">{i + 1}</span>
                  )}
                </span>

                {/* Thumbnail */}
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-input text-text-tertiary">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                )}

                {/* Song info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{song.title}</p>
                  <p className="truncate text-xs text-text-tertiary">
                    {t('ranking.by', locale)} {song.memberName} &middot; {t('group.round', locale)}{' '}
                    {song.roundNumber}
                  </p>
                </div>

                {/* Avg rating */}
                <div className="flex items-center gap-1 shrink-0">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="fill-star"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="font-mono text-sm font-bold text-star">
                    {song.avgRating.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
