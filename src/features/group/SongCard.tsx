import type { Locale } from '../../../site.config';
import type { Member, SongWithVotes } from '../../lib/types';
import { t } from '../../i18n';
import { StarRating } from '../../components/ui/StarRating';
import { PlatformLinks } from '../../components/ui/PlatformLinks';

interface SongCardProps {
  song: SongWithVotes;
  memberId: string | null;
  members: Member[];
  onRate: (songId: string, rating: number) => void;
  locale: Locale;
}

/**
 * Card for a single song: album art on the left, info + platform links + rating on the right.
 * If the song belongs to the current user, shows "Your track" instead of interactive stars.
 */
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

export function SongCard({ song, memberId, members, onRate, locale }: SongCardProps) {
  const isOwn = song.member_id === memberId;
  const addedByMember = members.find((m) => m.id === song.member_id);
  const addedByName = addedByMember?.name ?? '?';
  const thumbnailUrl = safeThumbUrl(song.thumbnail_url);

  // Find the current user's existing vote for this song
  const myVote = memberId ? song.votes.find((v) => v.member_id === memberId) : undefined;
  const myRating = myVote?.rating ?? null;

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-bg-card p-4">
      {/* Album artwork */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={song.album ? `${song.album} cover` : `${song.title} cover`}
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-bg-input text-2xl text-text-tertiary">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Title + artist */}
        <h3 className="truncate text-base font-semibold text-text">{song.title}</h3>
        <p className="mb-2 truncate text-sm text-text-secondary">{song.artist}</p>

        {/* Added by */}
        <p className="mb-2.5 text-xs text-text-tertiary">
          {t('group.songCard.addedBy', locale)}{' '}
          <span className="font-medium text-accent">{addedByName}</span>
        </p>

        {/* Platform links */}
        <div className="mb-3">
          <PlatformLinks links={song.platform_links} />
        </div>

        {/* Rating section */}
        <div className="flex items-center justify-between">
          {/* User's own rating or "Your track" */}
          {isOwn ? (
            <span className="text-xs italic text-text-tertiary">
              {t('group.songCard.yourTrack', locale)}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <StarRating
                rating={myRating}
                onRate={(rating) => onRate(song.id, rating)}
                size={20}
              />
              {myRating !== null && (
                <span className="font-mono text-sm font-semibold text-star">
                  {myRating.toFixed(1)}
                </span>
              )}
            </div>
          )}

          {/* Group average */}
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
            <span className="font-mono text-sm text-text-secondary">
              {song.avgRating.toFixed(1)}
            </span>
            <span className="text-xs text-text-tertiary">({song.totalVotes})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
