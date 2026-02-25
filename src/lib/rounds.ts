import { supabase } from './supabase';
import type { Round } from './types';

/** Returns Monday 00:00:00 UTC and Sunday 23:59:59.999 UTC of the current week */
export function getCurrentWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday, 0, 0, 0, 0),
  );

  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday + 6,
      23,
      59,
      59,
      999,
    ),
  );

  return { start, end };
}

/**
 * Ensures a round exists for the current week. If not, creates one
 * with number = max existing + 1.
 */
export async function ensureCurrentRound(groupId: string): Promise<Round> {
  const { start, end } = getCurrentWeekBounds();

  // Try to find an existing round that overlaps with the current week
  const { data: existing, error: selectError } = await supabase
    .from('rounds')
    .select('*')
    .eq('group_id', groupId)
    .eq('starts_at', start.toISOString())
    .eq('ends_at', end.toISOString())
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to query rounds: ${selectError.message}`);
  }

  if (existing) {
    return existing as Round;
  }

  // Get the highest round number for this group
  const { data: maxRound, error: maxError } = await supabase
    .from('rounds')
    .select('number')
    .eq('group_id', groupId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    throw new Error(`Failed to query max round number: ${maxError.message}`);
  }

  const nextNumber = maxRound ? maxRound.number + 1 : 1;

  const { data: created, error: insertError } = await supabase
    .from('rounds')
    .insert({
      group_id: groupId,
      number: nextNumber,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create round: ${insertError.message}`);
  }

  return created as Round;
}
