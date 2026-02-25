import type { Round } from '../../lib/types';

interface RoundInfoProps {
  round: Round;
  songCount: number;
  songsPerRound: number;
}

/** Format a date string to short human-readable form (e.g. "Feb 24") */
function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Accent-colored bar showing current round number, date range, and song counter.
 */
export function RoundInfo({ round, songCount, songsPerRound }: RoundInfoProps) {
  return (
    <div className="flex items-center justify-between border-b border-accent/15 bg-accent-soft px-5 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-accent">Round {round.number}</span>
        <span className="text-sm text-text-tertiary">
          {formatShortDate(round.starts_at)} &mdash; {formatShortDate(round.ends_at)}
        </span>
      </div>
      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-xs font-medium text-accent">
        {songCount}/{songsPerRound} songs
      </span>
    </div>
  );
}
