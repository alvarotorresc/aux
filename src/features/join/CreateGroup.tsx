import { useState } from 'react';
import type { Locale } from '../../../site.config';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { setMemberId } from '../../lib/storage';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmojiPicker, MUSIC_EMOJIS } from './EmojiPicker';

interface CreateGroupProps {
  locale: Locale;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function CreateGroup({ locale }: CreateGroupProps) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(MUSIC_EMOJIS[0]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError(t('create.error.empty', locale));
      return;
    }

    // maxLength on the input is 60 — enforce the same here defensively
    if (trimmed.length > 60) {
      setError(t('create.error.empty', locale));
      return;
    }

    const slug = slugify(trimmed);
    if (!slug || slug.length < 2) {
      setError(t('create.error.empty', locale));
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name: trimmed, slug, songs_per_round: 2 })
        .select()
        .single();

      if (groupError) {
        // Unique constraint on slug
        if (groupError.code === '23505') {
          setError(t('create.error.exists', locale));
          setIsSubmitting(false);
          return;
        }
        throw groupError;
      }

      // Create the admin member
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert({
          group_id: group.id,
          name: trimmed,
          avatar,
          is_admin: true,
        })
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // Store member ID in localStorage
      setMemberId(slug, member.id);

      // Redirect to group page
      const prefix = locale === 'es' ? '/es' : '';
      window.location.href = `${prefix}/g/${slug}`;
    } catch (err) {
      // Do not surface raw Supabase/DB error messages to the user
      console.error('[CreateGroup] unexpected error:', err);
      setError(t('create.error.generic', locale));
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{t('create.title', locale)}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="group-name"
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            {t('create.title', locale)}
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('create.placeholder', locale)}
            maxLength={60}
            autoFocus
            className="w-full rounded-md border border-border bg-bg-input px-4 py-2.5 text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <EmojiPicker
          selected={avatar}
          onSelect={setAvatar}
          label={t('create.pickAvatar', locale)}
        />

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '...' : t('create.button', locale)}
        </Button>
      </form>
    </Card>
  );
}
