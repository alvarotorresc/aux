import type { Locale } from '../../../site.config';
import type { Group, MemberStats } from '../../lib/types';
import { t } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { useLeaderboard } from './useLeaderboard';
import { Podium } from './Podium';
import { PastRounds } from './PastRounds';

interface LeaderboardViewProps {
  group: Group;
  locale: Locale;
}

// --- Sub-components ---

function LeaderboardNav({
  groupName,
  slug,
  locale,
}: {
  groupName: string;
  slug: string;
  locale: Locale;
}) {
  const backUrl = locale === 'es' ? `/es/g/${slug}` : `/g/${slug}`;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg px-5 py-4">
      <div className="flex items-center gap-2.5">
        <a href={backUrl} aria-label="Back to group">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-secondary"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </a>
        <h1 className="text-lg font-bold text-text">{t('leaderboard.title', locale)}</h1>
      </div>
      <span className="text-sm text-text-secondary">{groupName}</span>
    </nav>
  );
}

function RankingsTable({ members, locale }: { members: MemberStats[]; locale: Locale }) {
  return (
    <section className="px-5 py-6">
      <h3 className="mb-3 text-base font-semibold text-text">{t('leaderboard.allTime', locale)}</h3>
      <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
        {members.map((member, i) => (
          <div
            key={member.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${
              i < members.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            {/* Position number */}
            <span
              className={`w-6 text-center font-mono text-sm font-semibold ${
                i < 3 ? 'text-star' : 'text-text-tertiary'
              }`}
            >
              {i + 1}
            </span>

            {/* Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-input text-lg">
              {member.avatar}
            </div>

            {/* Name + stats row */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{member.name}</p>
              <p className="text-xs text-text-tertiary">
                {member.songsAdded} {t('leaderboard.songs', locale)} &middot;{' '}
                {t('leaderboard.avg', locale)} {member.avgReceived.toFixed(1)} &middot;{' '}
                {member.roundsWon}
                <span aria-hidden="true">{'\u{1F3C6}'}</span>
              </p>
            </div>

            {/* Total score */}
            <span className="font-mono text-base font-bold text-star">
              {member.totalScore.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4 px-5">
      <p className="text-sm text-error">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

// --- Main component ---

/**
 * Full leaderboard page view.
 * Shows podium, all-time rankings table, and past rounds history.
 */
export function LeaderboardView({ group, locale }: LeaderboardViewProps) {
  const { members, pastRounds, isLoading, error } = useLeaderboard(group.id);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <LeaderboardNav groupName={group.name} slug={group.slug} locale={locale} />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <>
          <Podium members={members} locale={locale} />
          <RankingsTable members={members} locale={locale} />
          <PastRounds rounds={pastRounds} locale={locale} />
        </>
      )}
    </div>
  );
}
