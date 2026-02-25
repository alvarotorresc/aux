import { useState } from 'react';
import type { Locale } from '../../../site.config';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { setMemberId } from '../../lib/storage';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmojiPicker, MUSIC_EMOJIS } from './EmojiPicker';

interface JoinGroupProps {
  slug: string;
  groupId: string;
  locale: Locale;
}

export function JoinGroup({ slug, groupId, locale }: JoinGroupProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(MUSIC_EMOJIS[0]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: member, error: insertError } = await supabase
        .from('members')
        .insert({
          group_id: groupId,
          name: trimmed,
          avatar,
          is_admin: false,
        })
        .select()
        .single();

      if (insertError) {
        // Unique constraint on (group_id, name) — re-use existing member
        if (insertError.code === '23505') {
          const { data: existing, error: selectError } = await supabase
            .from('members')
            .select('*')
            .eq('group_id', groupId)
            .eq('name', trimmed)
            .single();

          if (selectError || !existing) {
            throw selectError ?? new Error('Failed to find existing member');
          }

          setMemberId(slug, existing.id);
          window.location.reload();
          return;
        }

        throw insertError;
      }

      setMemberId(slug, member.id);
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h2 className="mb-6 text-2xl font-bold">{t('join.title', locale)}</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="member-name"
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            {t('join.placeholder', locale)}
          </label>
          <input
            id="member-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('join.placeholder', locale)}
            maxLength={40}
            autoFocus
            className="w-full rounded-md border border-border bg-bg-input px-4 py-2.5 text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <EmojiPicker selected={avatar} onSelect={setAvatar} label={t('join.pickAvatar', locale)} />

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? '...' : t('join.button', locale)}
        </Button>
      </form>
    </Card>
  );
}
