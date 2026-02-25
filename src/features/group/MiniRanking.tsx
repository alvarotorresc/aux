import type { Locale } from '../../../site.config';
import type { Member, SongWithVotes } from '../../lib/types';
import { t } from '../../i18n';

interface MiniRankingProps {
  songs: SongWithVotes[];
  members: Member[];
  roundNumber: number;
  locale: Locale;
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'] as const; // gold, silver, bronze

/** Only allow https thumbnails to be rendered; silently drop anything else. */
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
 * Ranking of songs sorted by average rating, with medals for top 3.
 */
export function MiniRanking({ songs, members, roundNumber, locale }: MiniRankingProps) {
  const sorted = [...songs].sort((a, b) => b.avgRating - a.avgRating);

  function getMemberName(memberId: string): string {
    return members.find((m) => m.id === memberId)?.name ?? '?';
  }

  return (
    <div className="flex flex-col gap-2 p-5">
      <h3 className="mb-2 text-base font-semibold text-text">
        {t('group.ranking.title', locale)} {roundNumber}
      </h3>

      {sorted.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('group.noSongsYet', locale)}</p>
      ) : (
        sorted.map((song, i) => {
          const isFirst = i === 0 && song.totalVotes > 0;
          const thumbnailUrl = safeThumbUrl(song.thumbnail_url);
          return (
            <div
              key={song.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                isFirst ? 'border-star/20 bg-star/[0.08]' : 'border-border bg-bg-card'
              }`}
            >
              {/* Position: medal or number */}
              <span className="w-7 text-center text-lg">
                {i < 3 && song.totalVotes > 0 ? (
                  MEDALS[i]
                ) : (
                  <span className="font-mono text-sm text-text-tertiary">{i + 1}</span>
                )}
              </span>

              {/* Thumbnail */}
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="h-10 w-10 rounded-md object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-input text-text-tertiary">
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
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-medium text-text">{song.title}</p>
                <p className="text-xs text-text-tertiary">
                  {t('ranking.by', locale)} {getMemberName(song.member_id)}
                </p>
              </div>

              {/* Average rating */}
              <div className="flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="fill-star"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="font-mono text-sm font-semibold text-star">
                  {song.avgRating.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
