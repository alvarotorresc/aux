import { useState } from 'react';
import type { Locale } from '../../../site.config';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface CreateGroupProps {
  locale: Locale;
}

function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  const array = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of array) {
    code += chars[byte % chars.length];
  }
  return code;
}

export function CreateGroup({ locale }: CreateGroupProps) {
  const [name, setName] = useState('');
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

    if (trimmed.length > 60) {
      setError(t('create.error.empty', locale));
      return;
    }

    setIsSubmitting(true);

    try {
      const slug = generateCode();
      const { error: groupError } = await supabase
        .from('groups')
        .insert({ name: trimmed, slug, songs_per_round: 3 })
        .select()
        .single();

      if (groupError) {
        if (groupError.code === '23505') {
          // Code collision — extremely unlikely with 6 chars, just retry
          setIsSubmitting(false);
          handleSubmit(e);
          return;
        }
        throw groupError;
      }

      // Redirect to group page — JoinGroup will ask for the user's name
      const prefix = locale === 'es' ? '/es' : '';
      window.location.href = `${prefix}/g/${slug}`;
    } catch (err) {
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
