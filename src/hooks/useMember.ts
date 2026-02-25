import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMemberId } from '../lib/storage';
import type { Member } from '../lib/types';

interface UseMemberResult {
  member: Member | null;
  isLoading: boolean;
}

export function useMember(slug: string): UseMemberResult {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMember() {
      const storedId = getMemberId(slug);

      if (!storedId) {
        setMember(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', storedId)
        .maybeSingle();

      if (error || !data) {
        setMember(null);
      } else {
        setMember(data as Member);
      }

      setIsLoading(false);
    }

    fetchMember();
  }, [slug]);

  return { member, isLoading };
}
