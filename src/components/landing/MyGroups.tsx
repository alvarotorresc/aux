import { useEffect, useState } from 'react';
import type { Locale } from '../../../site.config';
import { t } from '../../i18n';
import { getMyGroups, type SavedGroup } from '../../lib/storage';

interface MyGroupsProps {
  locale: Locale;
}

export function MyGroups({ locale }: MyGroupsProps) {
  const [groups, setGroups] = useState<SavedGroup[]>([]);

  useEffect(() => {
    setGroups(getMyGroups());
  }, []);

  if (groups.length === 0) return null;

  const prefix = locale === 'es' ? '/es' : '';

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h2 className="mb-3 text-center text-sm font-medium text-text-secondary">
        {t('hero.myGroups', locale)}
      </h2>
      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <a
            key={group.slug}
            href={`${prefix}/g/${group.slug}`}
            className="flex items-center justify-between rounded-lg border border-border bg-bg-card px-4 py-3 transition-colors hover:border-accent"
          >
            <span className="truncate font-medium text-text">{group.name}</span>
            <span className="ml-3 shrink-0 font-mono text-xs text-text-tertiary">{group.slug}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
