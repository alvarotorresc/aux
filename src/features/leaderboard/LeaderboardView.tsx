import { useState } from 'react';
import type { Locale } from '../../../site.config';
import type { Group, MemberStats } from '../../lib/types';
import { t } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { GenreFilter } from '../../components/ui/GenreFilter';
import { useLeaderboard } from './useLeaderboard';
import type { PastRoundSong } from './useLeaderboard';
import { Podium } from './Podium';
import { PastRounds } from './PastRounds';
import { TopSongs } from './TopSongs';

interface LeaderboardViewProps {
  group: Group;
  locale: Locale;
}

type Tab = 'current' | 'alltime';

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
  const wrappedUrl = locale === 'es' ? `/es/g/${slug}/wrapped` : `/g/${slug}/wrapped`;

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
      <div className="flex items-center gap-3">
        <a
          href={wrappedUrl}
          className="rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          {t('wrapped.title', locale)}
        </a>
        <span className="text-sm text-text-secondary">{groupName}</span>
      </div>
    </nav>
  );
}

function TabSwitcher({
  active,
  onChange,
  locale,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  locale: Locale;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'current', label: t('leaderboard.tabCurrent', locale) },
    { id: 'alltime', label: t('leaderboard.tabAllTime', locale) },
  ];

  return (
    <div className="flex border-b border-border px-5" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`cursor-pointer border-b-2 px-5 py-3 text-sm transition-colors ${
            active === tab.id
              ? 'border-accent font-semibold text-text'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
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

function CurrentRoundRanking({
  songs,
  roundNumber,
  locale,
}: {
  songs: PastRoundSong[];
  roundNumber: number | null;
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-2 p-5">
      {roundNumber !== null && (
        <h3 className="mb-1 text-base font-semibold text-text">
          {t('group.ranking.title', locale)} {roundNumber}
        </h3>
      )}

      {songs.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          {t('leaderboard.noCurrentSongs', locale)}
        </p>
      ) : (
        songs.map((song, i) => {
          const thumbUrl = safeThumbUrl(song.thumbnail_url);
          const isFirst = i === 0 && song.totalVotes > 0;
          return (
            <div
              key={song.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                isFirst ? 'border-star/20 bg-star/[0.08]' : 'border-border bg-bg-card'
              }`}
            >
              {/* Position */}
              <span className="w-7 text-center text-lg">
                {i < 3 && song.totalVotes > 0 ? (
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
                  {t('ranking.by', locale)} {song.memberName}
                </p>
              </div>

              {/* Rating */}
              {song.totalVotes > 0 ? (
                <div className="flex shrink-0 items-center gap-1">
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
              ) : (
                <span className="shrink-0 text-xs text-text-tertiary">—</span>
              )}
            </div>
          );
        })
      )}
    </div>
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

function ErrorState({
  message,
  onRetry,
  locale,
}: {
  message: string;
  onRetry: () => void;
  locale: Locale;
}) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-4 px-5">
      <p className="text-sm text-error">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {t('group.retry', locale)}
      </Button>
    </div>
  );
}

// --- Main component ---

/**
 * Full leaderboard page view with two tabs:
 * - "This round": live ranking of the current round's songs
 * - "All-time": podium, historical standings, top songs, past rounds
 */
export function LeaderboardView({ group, locale }: LeaderboardViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('current');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const { members, pastRounds, topSongs, currentRoundNumber, currentRoundSongs, isLoading, error } =
    useLeaderboard(group.id);

  const filteredPastRounds = genreFilter
    ? pastRounds.filter((r) => r.topGenre === genreFilter)
    : pastRounds;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <LeaderboardNav groupName={group.name} slug={group.slug} locale={locale} />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} locale={locale} />
      ) : (
        <>
          <TabSwitcher active={activeTab} onChange={setActiveTab} locale={locale} />

          {activeTab === 'current' ? (
            <CurrentRoundRanking
              songs={currentRoundSongs}
              roundNumber={currentRoundNumber}
              locale={locale}
            />
          ) : (
            <>
              <Podium members={members} locale={locale} />
              <RankingsTable members={members} locale={locale} />
              <TopSongs songs={topSongs} locale={locale} />
              <div className="px-5 pt-2">
                <GenreFilter value={genreFilter} onChange={setGenreFilter} locale={locale} />
              </div>
              <PastRounds rounds={filteredPastRounds} locale={locale} />
            </>
          )}
        </>
      )}
    </div>
  );
}
