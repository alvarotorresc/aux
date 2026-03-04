import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../../site.config';
import type { Group } from '../../lib/types';
import { t } from '../../i18n';
import { formatPeriodLabel, type WrappedPeriod, type WrappedStats } from '../../lib/wrapped';
import { GenreBadge } from '../../components/ui/GenreBadge';
import { Button } from '../../components/ui/Button';
import { useWrapped } from './useWrapped';
import { PlaylistCard } from './PlaylistCard';

interface WrappedViewProps {
  group: Group;
  locale: Locale;
}

// --- Animation hook ---

function useInView(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

function AnimatedCard({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, visible] = useInView();

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-border bg-bg-card p-5 transition-all duration-500 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// --- Sub-components ---

function WrappedNav({
  groupName,
  slug,
  locale,
}: {
  groupName: string;
  slug: string;
  locale: Locale;
}) {
  const backUrl = locale === 'es' ? `/es/g/${slug}/leaderboard` : `/g/${slug}/leaderboard`;

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-bg px-5 py-4">
      <div className="flex items-center gap-2.5">
        <a href={backUrl} aria-label={t('wrapped.back', locale)}>
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
        <h1 className="text-lg font-bold text-text">{t('wrapped.title', locale)}</h1>
      </div>
      <span className="text-sm text-text-secondary">{groupName}</span>
    </nav>
  );
}

function PeriodSelector({
  periods,
  selected,
  onSelect,
}: {
  periods: WrappedPeriod[];
  selected: WrappedPeriod | null;
  onSelect: (period: WrappedPeriod) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-5 py-3 scrollbar-none" role="tablist">
      {periods.map((period) => {
        const label = formatPeriodLabel(period);
        const isActive =
          selected !== null &&
          period.type === selected.type &&
          period.year === selected.year &&
          (period.type === 'annual' ||
            period.quarter === (selected as { quarter: number }).quarter);

        return (
          <button
            key={label}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(period)}
            className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-bg-card text-text-secondary hover:text-text'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function OverviewCard({ stats, locale }: { stats: WrappedStats; locale: Locale }) {
  const items = [
    { value: stats.totalSongs, label: t('wrapped.songs', locale) },
    { value: stats.totalRounds, label: t('wrapped.rounds', locale) },
    { value: stats.totalVotes, label: t('wrapped.votes', locale) },
  ];

  return (
    <AnimatedCard delay={0}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
        {t('wrapped.overview', locale)}
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="font-mono text-3xl font-bold text-accent">{item.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-text-tertiary">{item.label}</p>
          </div>
        ))}
      </div>
    </AnimatedCard>
  );
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

function TopSongCard({ stats, locale }: { stats: WrappedStats; locale: Locale }) {
  if (!stats.topSong) return null;

  const song = stats.topSong;
  const thumbUrl = safeThumbUrl(song.thumbnail_url);
  const label =
    stats.period.type === 'annual'
      ? t('wrapped.songOfYear', locale)
      : t('wrapped.songOfPeriod', locale);

  return (
    <AnimatedCard delay={100} className="border-star/30 bg-star/[0.05]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </h2>
      <div className="flex items-center gap-4">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-bg-input text-text-tertiary">
            <svg
              width="24"
              height="24"
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-text">{song.title}</p>
          <p className="truncate text-sm text-text-secondary">{song.artist}</p>
          <div className="mt-1 flex items-center gap-2">
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
              <span className="font-mono text-sm font-bold text-star">
                {song.avgRating.toFixed(1)}
              </span>
            </div>
            {song.genre && <GenreBadge genre={song.genre} />}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-text-tertiary">
        {t('ranking.by', locale)} {song.memberName}
      </p>
    </AnimatedCard>
  );
}

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'] as const;
const MEDAL_COLORS = ['#FBBF24', '#C0C0C0', '#CD7F32'] as const;

function TopMembersCard({ stats, locale }: { stats: WrappedStats; locale: Locale }) {
  const members = stats.topMembers.filter((m) => m.songsAdded > 0);
  if (members.length === 0) return null;

  return (
    <AnimatedCard delay={200}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
        {t('wrapped.topMembers', locale)}
      </h2>
      <div className="flex flex-col gap-2">
        {members.map((member, i) => (
          <div
            key={member.id}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              i === 0 ? 'border-star/30 bg-star/[0.08]' : 'border-border bg-bg'
            }`}
          >
            <span className="w-7 shrink-0 text-center text-lg">
              {i < 3 ? (
                MEDALS[i]
              ) : (
                <span className="font-mono text-sm text-text-tertiary">{i + 1}</span>
              )}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-input text-lg">
              {member.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{member.name}</p>
              <p className="text-xs text-text-tertiary">
                {member.songsAdded} {t('leaderboard.songs', locale)} &middot;{' '}
                {t('leaderboard.avg', locale)} {member.avgReceived.toFixed(1)} &middot;{' '}
                {member.roundsWon}
                <span aria-hidden="true">{'\u{1F3C6}'}</span>
              </p>
            </div>
            <span
              className="font-mono text-base font-bold"
              style={{ color: i < 3 ? MEDAL_COLORS[i] : undefined }}
            >
              {member.totalScore.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </AnimatedCard>
  );
}

function TopSongsCard({ stats, locale }: { stats: WrappedStats; locale: Locale }) {
  if (stats.topSongs.length === 0) return null;

  return (
    <AnimatedCard delay={300}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
        {t('wrapped.topSongs', locale)}
      </h2>
      <div className="flex flex-col gap-2">
        {stats.topSongs.map((song, i) => {
          const thumbUrl = safeThumbUrl(song.thumbnail_url);
          return (
            <div
              key={song.id}
              className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                i === 0 ? 'border-star/30 bg-star/[0.08]' : 'border-border bg-bg'
              }`}
            >
              <span className="w-7 shrink-0 text-center text-lg">
                {i < 3 ? (
                  MEDALS[i]
                ) : (
                  <span className="font-mono text-sm text-text-tertiary">{i + 1}</span>
                )}
              </span>
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{song.title}</p>
                <p className="truncate text-xs text-text-tertiary">
                  {song.artist} &middot; {t('ranking.by', locale)} {song.memberName}
                </p>
              </div>
              {song.totalVotes > 0 && (
                <div className="flex shrink-0 items-center gap-1">
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
              )}
            </div>
          );
        })}
      </div>
    </AnimatedCard>
  );
}

function GenresCard({ stats, locale }: { stats: WrappedStats; locale: Locale }) {
  if (stats.genreDistribution.length === 0) return null;

  const maxCount = stats.genreDistribution[0].count;

  return (
    <AnimatedCard delay={400}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
        {t('wrapped.genres', locale)}
      </h2>
      <div className="flex flex-col gap-2.5">
        {stats.genreDistribution.map((item) => (
          <div key={item.genre} className="flex items-center gap-3">
            <div className="w-20 shrink-0">
              <GenreBadge genre={item.genre} />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-bg-input">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent/20"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs font-semibold text-text-secondary">
                {item.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AnimatedCard>
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

function EmptyState({ locale }: { locale: Locale }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center px-5">
      <p className="text-center text-sm text-text-secondary">{t('wrapped.noData', locale)}</p>
    </div>
  );
}

// --- Main component ---

export function WrappedView({ group, locale }: WrappedViewProps) {
  const { stats, availablePeriods, selectedPeriod, setSelectedPeriod, isLoading, error } =
    useWrapped(group.id);

  const hasData = stats !== null && stats.totalSongs > 0;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <WrappedNav groupName={group.name} slug={group.slug} locale={locale} />

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} locale={locale} />
      ) : (
        <>
          {availablePeriods.length > 0 && (
            <PeriodSelector
              periods={availablePeriods}
              selected={selectedPeriod}
              onSelect={setSelectedPeriod}
            />
          )}

          {!hasData ? (
            <EmptyState locale={locale} />
          ) : (
            <div className="flex flex-col gap-4 p-5">
              <OverviewCard stats={stats} locale={locale} />
              <TopSongCard stats={stats} locale={locale} />
              <TopMembersCard stats={stats} locale={locale} />
              <TopSongsCard stats={stats} locale={locale} />
              <GenresCard stats={stats} locale={locale} />
              {stats.allSongs.length > 0 && (
                <AnimatedCard delay={500}>
                  <PlaylistCard songs={stats.allSongs} locale={locale} />
                </AnimatedCard>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
