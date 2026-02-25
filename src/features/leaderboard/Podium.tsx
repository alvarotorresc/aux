import type { Locale } from '../../../site.config';
import type { MemberStats } from '../../lib/types';
import { t } from '../../i18n';

interface PodiumProps {
  members: MemberStats[];
  locale: Locale;
}

const MEDAL_COLORS = {
  gold: '#FBBF24',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

interface PodiumSlotProps {
  member: MemberStats;
  rank: 1 | 2 | 3;
  barHeight: string;
  medalColor: string;
  locale: Locale;
}

function PodiumSlot({ member, rank, barHeight, medalColor, locale }: PodiumSlotProps) {
  const isFirst = rank === 1;
  const avatarSize = isFirst ? 'h-[72px] w-[72px] text-[32px]' : 'h-14 w-14 text-2xl';
  const barWidth = isFirst ? 'w-[90px]' : 'w-[70px]';
  const nameSize = isFirst ? 'text-base' : 'text-sm';
  const medal = rank === 1 ? '\u{1F947}' : rank === 2 ? '\u{1F948}' : '\u{1F949}';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar */}
      <div
        className={`${avatarSize} flex items-center justify-center rounded-full border-2 bg-bg-card`}
        style={{
          borderColor: medalColor,
          boxShadow: isFirst ? `0 0 20px ${medalColor}40` : 'none',
        }}
        role="img"
        aria-label={member.name}
      >
        {member.avatar}
      </div>

      {/* Name */}
      <span className={`${nameSize} font-semibold text-text`}>{member.name}</span>

      {/* Score */}
      <span className="text-[13px] font-bold font-mono" style={{ color: medalColor }}>
        {member.totalScore.toFixed(1)} {t('leaderboard.pts', locale)}
      </span>

      {/* Podium bar */}
      <div
        className={`${barWidth} flex items-start justify-center rounded-t-lg pt-2`}
        style={{
          height: barHeight,
          background: `${medalColor}20`,
          border: `1px solid ${medalColor}30`,
          borderBottom: 'none',
        }}
      >
        <span className="text-xl" aria-hidden="true">
          {medal}
        </span>
      </div>
    </div>
  );
}

/**
 * Podium displaying the top 3 members.
 * Layout: 2nd on the left, 1st in the center (tallest), 3rd on the right.
 * Handles fewer than 3 members gracefully.
 */
export function Podium({ members, locale }: PodiumProps) {
  if (members.length === 0) return null;

  const [first, second, third] = members;

  return (
    <section
      className="flex items-end justify-center gap-2 px-5 pt-10"
      aria-label={t('leaderboard.title', locale)}
    >
      {second && (
        <PodiumSlot
          member={second}
          rank={2}
          barHeight="80px"
          medalColor={MEDAL_COLORS.silver}
          locale={locale}
        />
      )}
      <PodiumSlot
        member={first}
        rank={1}
        barHeight="110px"
        medalColor={MEDAL_COLORS.gold}
        locale={locale}
      />
      {third && (
        <PodiumSlot
          member={third}
          rank={3}
          barHeight="60px"
          medalColor={MEDAL_COLORS.bronze}
          locale={locale}
        />
      )}
    </section>
  );
}
