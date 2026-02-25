import { useEffect, useState } from 'react';
import type { Locale } from '../../../site.config';
import type { Member } from '../../lib/types';
import { t } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { setMemberId } from '../../lib/storage';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmojiPicker, MUSIC_EMOJIS } from './EmojiPicker';

type JoinStep = 'select' | 'create';

interface JoinGroupProps {
  slug: string;
  groupId: string;
  locale: Locale;
  /** Pre-fetched members. When omitted the component fetches them from Supabase. */
  members?: Member[];
}

export function JoinGroup({ slug, groupId, locale, members: membersProp }: JoinGroupProps) {
  const [members, setMembers] = useState<Member[]>(membersProp ?? []);
  const [membersLoading, setMembersLoading] = useState(!membersProp);
  const [step, setStep] = useState<JoinStep>(membersProp?.length ? 'select' : 'create');

  // Creation form state
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(MUSIC_EMOJIS[0]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch members if not passed as prop
  useEffect(() => {
    if (membersProp) return;

    let cancelled = false;

    async function fetchMembers() {
      const { data, error: fetchError } = await supabase
        .from('members')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        console.error('[JoinGroup] failed to fetch members:', fetchError);
        setMembersLoading(false);
        setStep('create');
        return;
      }

      const fetched = (data ?? []) as Member[];
      setMembers(fetched);
      setStep(fetched.length > 0 ? 'select' : 'create');
      setMembersLoading(false);
    }

    fetchMembers();
    return () => {
      cancelled = true;
    };
  }, [groupId, membersProp]);

  // Sync step when membersProp changes externally
  useEffect(() => {
    if (membersProp) {
      setMembers(membersProp);
      if (membersProp.length === 0) setStep('create');
    }
  }, [membersProp]);

  function handleSelectMember(memberId: string) {
    setMemberId(slug, memberId);
    window.location.reload();
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError(t('join.error.empty', locale));
      return;
    }

    // maxLength on the input is 40 -- enforce the same here defensively
    if (trimmed.length > 40) {
      setError(t('join.error.tooLong', locale));
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
        // Unique constraint on (group_id, name) -- re-use existing member.
        // BUG-20: avatar is ignored on conflict, but with the new "select existing
        // member" flow this path is much less likely to be hit.
        if (insertError.code === '23505') {
          const { data: existing, error: selectError } = await supabase
            .from('members')
            .select('*')
            .eq('group_id', groupId)
            .eq('name', trimmed)
            .single();

          if (selectError || !existing) {
            // Do not reveal whether the member exists; show a generic message
            setError(t('join.error.generic', locale));
            setIsSubmitting(false);
            return;
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
      // Do not surface raw Supabase/DB error messages to the user
      console.error('[JoinGroup] unexpected error:', err);
      setError(t('join.error.generic', locale));
      setIsSubmitting(false);
    }
  }

  if (membersLoading) {
    return (
      <Card className="mx-auto max-w-md">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <h2 className="mb-6 text-2xl font-bold">{t('join.title', locale)}</h2>

      {/* --- Step 1: Select existing member --- */}
      {step === 'select' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-text-secondary">
            {t('join.selectMember', locale)}
          </p>

          <ul
            className="flex flex-col gap-2"
            role="listbox"
            aria-label={t('join.selectMember', locale)}
          >
            {members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelectMember(member.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-bg-input px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-card text-xl">
                    {member.avatar}
                  </span>
                  <span className="min-w-0 truncate font-medium text-text">{member.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="relative my-2 flex items-center">
            <div className="flex-1 border-t border-border" />
            <span className="px-3 text-xs text-text-tertiary">{t('join.orCreateNew', locale)}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <Button variant="secondary" onClick={() => setStep('create')}>
            {t('join.newMember', locale)}
          </Button>
        </div>
      )}

      {/* --- Step 2: Create new member --- */}
      {step === 'create' && (
        <div className="flex flex-col gap-5">
          {members.length > 0 && (
            <button
              type="button"
              onClick={() => setStep('select')}
              className="flex cursor-pointer items-center gap-1 self-start text-sm text-text-secondary transition-colors hover:text-text"
            >
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
                <path d="m15 18-6-6 6-6" />
              </svg>
              {t('join.selectMember', locale)}
            </button>
          )}

          <form onSubmit={handleCreateSubmit} className="flex flex-col gap-5">
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

            <EmojiPicker
              selected={avatar}
              onSelect={setAvatar}
              label={t('join.pickAvatar', locale)}
            />

            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? '...' : t('join.button', locale)}
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
