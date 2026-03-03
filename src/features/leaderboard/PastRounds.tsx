import type { Locale } from '../../../site.config';
import type { PastRound } from './useLeaderboard';
import { t } from '../../i18n';
import { GenreBadge } from '../../components/ui/GenreBadge';

interface PastRoundsProps {
  rounds: PastRound[];
  locale: Locale;
}

/**
 * List of past round results showing winner, top song, and score.
 * Empty state message when no past rounds exist.
 */
export function PastRounds({ rounds, locale }: PastRoundsProps) {
  return (
    <section className="px-5 pb-6">
      <h3 className="mb-3 text-base font-semibold text-text">
        {t('leaderboard.pastRounds', locale)}
      </h3>

      {rounds.length === 0 ? (
        <p className="text-sm text-text-secondary">{t('leaderboard.noPastRounds', locale)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rounds.map((round) => (
            <div
              key={round.number}
              className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3"
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

              {/* Right: winner + score */}
              <div className="ml-4 shrink-0 text-right">
                <p className="text-[13px] font-medium text-text">
                  <span aria-hidden="true">{'\u{1F3C6}'}</span> {round.winner}
                </p>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
