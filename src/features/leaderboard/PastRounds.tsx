import { useState } from 'react';
import type { Locale } from '../../../site.config';
import type { PastRound, PastRoundSong } from './useLeaderboard';
import { t } from '../../i18n';
import { GenreBadge } from '../../components/ui/GenreBadge';

interface PastRoundsProps {
  rounds: PastRound[];
  locale: Locale;
}

function safeThumbUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'] as const;

function RoundSongList({ songs, locale }: { songs: PastRoundSong[]; locale: Locale }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 pb-3 pt-1">
      {songs.map((song, i) => {
        const thumbUrl = safeThumbUrl(song.thumbnail_url);
        const isFirst = i === 0 && song.totalVotes > 0;
        return (
          <div
            key={song.id}
            className={`flex items-center gap-2.5 rounded-lg border p-2 ${
              isFirst ? 'border-star/20 bg-star/[0.08]' : 'border-border bg-bg'
            }`}
          >
            {/* Position */}
            <span className="w-6 shrink-0 text-center text-base">
              {i < 3 && song.totalVotes > 0 ? (
                MEDALS[i]
              ) : (
                <span className="font-mono text-xs text-text-tertiary">{i + 1}</span>
              )}
            </span>

            {/* Thumbnail */}
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-input text-text-tertiary">
                <svg
                  width="14"
                  height="14"
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
              <p className="truncate text-xs font-medium text-text">{song.title}</p>
              <p className="truncate text-[11px] text-text-tertiary">
                {t('ranking.by', locale)} {song.memberName}
              </p>
            </div>

            {/* Rating */}
            {song.totalVotes > 0 ? (
              <div className="flex items-center gap-1 shrink-0">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="fill-star"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="font-mono text-xs font-semibold text-star">
                  {song.avgRating.toFixed(1)}
                </span>
              </div>
            ) : (
              <span className="shrink-0 text-[11px] text-text-tertiary">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * List of past round results. Each card is expandable to show the full ranking.
 */
export function PastRounds({ rounds, locale }: PastRoundsProps) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  function toggleRound(number: number) {
    setExpandedRound((prev) => (prev === number ? null : number));
  }

  return (
    <section className="px-5 pb-6">
      <h3 className="mb-3 text-base font-semibold text-text">
        {t('leaderboard.pastRounds', locale)}
      </h3>

      {rounds.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('leaderboard.noPastRounds', locale)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rounds.map((round) => {
            const isExpanded = expandedRound === round.number;
            return (
              <div
                key={round.number}
                className="overflow-hidden rounded-lg border border-border bg-bg-card"
              >
                {/* Summary row — clickable */}
                <button
                  onClick={() => toggleRound(round.number)}
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-bg-input"
                  aria-expanded={isExpanded}
                >
                  {/* Left: round number + song info */}
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-accent">
                      {t('group.round', locale)} {round.number}
                    </span>
                    <p className="mt-0.5 truncate text-[13px] text-text-secondary">
                      {round.topSong} — {round.topArtist}
                    </p>
                    {round.topGenre && (
                      <div className="mt-0.5">
                        <GenreBadge genre={round.topGenre} />
                      </div>
                    )}
                  </div>

                  {/* Right: winner + score + chevron */}
                  <div className="ml-4 flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[13px] font-medium text-text">
                        <span aria-hidden="true">{'\u{1F3C6}'}</span> {round.winner}
                      </p>
                      {round.topScore > 0 && (
                        <div className="flex items-center justify-end gap-1">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="fill-star"
                          >
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span className="font-mono text-[13px] text-star">
                            {round.topScore.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`shrink-0 text-text-tertiary transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </button>

                {/* Expanded song list */}
                {isExpanded && round.songs.length > 0 && (
                  <div className="border-t border-border">
                    <RoundSongList songs={round.songs} locale={locale} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
