import { useState } from 'react';
import type { Locale } from '../../../site.config';
import type { Group, Member } from '../../lib/types';
import { t } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { useMember } from '../../hooks/useMember';
import { JoinGroup } from '../join/JoinGroup';
import { useGroup } from './useGroup';
import { RoundInfo } from './RoundInfo';
import { AddSong } from './AddSong';
import { SongCard } from './SongCard';
import { MiniRanking } from './MiniRanking';

interface GroupViewProps {
  group: Group;
  members: Member[];
  locale: Locale;
}

type Tab = 'songs' | 'ranking';

// --- Sub-components ---

function ShareButton({ slug, locale }: { slug: string; locale: Locale }) {
  function handleShare() {
    const url = `${window.location.origin}/g/${slug}`;
    if (navigator.share) {
      navigator.share({ title: 'Aux', url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleShare}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-1.5"
        aria-hidden="true"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" x2="12" y1="2" y2="15" />
      </svg>
      {t('group.share', locale)}
    </Button>
  );
}

function GroupNav({
  group,
  memberCount,
  locale,
}: {
  group: Group;
  memberCount: number;
  locale: Locale;
}) {
  return (
    <nav className="flex items-center justify-between border-b border-border bg-bg px-5 py-4">
      <div>
        <h1 className="text-lg font-bold leading-tight text-text">{group.name}</h1>
        <p className="text-xs text-text-tertiary">
          {memberCount} {t('group.members', locale).toLowerCase()}
        </p>
      </div>
      <ShareButton slug={group.slug} locale={locale} />
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
    { id: 'songs', label: t('group.songs', locale) },
    { id: 'ranking', label: t('group.ranking', locale) },
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

function GroupContent({
  group,
  members,
  memberId,
  locale,
}: {
  group: Group;
  members: Member[];
  memberId: string;
  locale: Locale;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const { round, songs, isLoading, error, addSong, voteSong, refetch } = useGroup(
    group.id,
    memberId,
    group.songs_per_round,
  );

  if (isLoading) {
    return (
      <>
        <GroupNav group={group} memberCount={members.length} locale={locale} />
        <LoadingSpinner />
      </>
    );
  }

  if (error || !round) {
    return (
      <>
        <GroupNav group={group} memberCount={members.length} locale={locale} />
        <ErrorState message={error ?? 'Failed to load round'} onRetry={refetch} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <GroupNav group={group} memberCount={members.length} locale={locale} />
      <RoundInfo round={round} songCount={songs.length} songsPerRound={group.songs_per_round} />
      <TabSwitcher active={activeTab} onChange={setActiveTab} locale={locale} />

      {activeTab === 'songs' ? (
        <div className="flex flex-col gap-3 p-5">
          {songs.filter((s) => s.member_id === memberId).length < group.songs_per_round && (
            <AddSong onAddSong={addSong} locale={locale} />
          )}
          {songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              memberId={memberId}
              members={members}
              onRate={voteSong}
              locale={locale}
            />
          ))}
          {songs.length === 0 && (
            <p className="py-8 text-center text-sm text-text-secondary">
              No songs yet. Be the first to add one!
            </p>
          )}
        </div>
      ) : (
        <>
          <MiniRanking songs={songs} members={members} roundNumber={round.number} locale={locale} />
          <div className="px-5 pb-5">
            <a
              href={`${locale === 'es' ? '/es' : ''}/g/${group.slug}/leaderboard`}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-card px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-bg-input"
            >
              {t('leaderboard.fullLink', locale)}
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
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Root component for the group page.
 * Shows JoinGroup if the user is not a member, otherwise renders the full group view.
 */
export function GroupView({ group, members, locale }: GroupViewProps) {
  const { member, isLoading } = useMember(group.slug);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!member) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-5 py-12">
        <JoinGroup slug={group.slug} groupId={group.id} locale={locale} />
      </div>
    );
  }

  return <GroupContent group={group} members={members} memberId={member.id} locale={locale} />;
}
