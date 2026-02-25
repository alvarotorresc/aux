import type { Locale } from '../../../site.config';
import type { Group, Member } from '../../lib/types';
import { t } from '../../i18n';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { JoinGroup } from '../join/JoinGroup';
import { useMember } from '../../hooks/useMember';

interface GroupPlaceholderProps {
  group: Group;
  members: Member[];
  locale: Locale;
}

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
      {t('group.share', locale)}
    </Button>
  );
}

export function GroupPlaceholder({ group, members, locale }: GroupPlaceholderProps) {
  const { member, isLoading } = useMember(group.slug);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-5 py-12">
        <JoinGroup slug={group.slug} groupId={group.id} locale={locale} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{group.name}</h1>
        <ShareButton slug={group.slug} locale={locale} />
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">
          {t('group.members', locale)} ({members.length})
        </h2>
        <ul className="flex flex-wrap gap-3">
          {members.map((m) => (
            <li
              key={m.id}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                m.id === member.id
                  ? 'border-primary bg-primary/10 text-text'
                  : 'border-border bg-bg-input text-text-secondary'
              }`}
            >
              <span aria-hidden="true">{m.avatar}</span>
              <span>{m.name}</span>
              {m.is_admin && (
                <span className="text-xs text-text-tertiary" title="Admin">
                  *
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="text-center text-text-secondary">{t('group.placeholder', locale)}</p>
      </Card>
    </div>
  );
}
