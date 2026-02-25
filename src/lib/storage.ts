const STORAGE_PREFIX = 'aux:members';

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}:${slug}`;
}

/** Read the stored member ID for a given group slug */
export function getMemberId(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(storageKey(slug));
}

/** Store the member ID for a given group slug */
export function setMemberId(slug: string, memberId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(slug), memberId);
}

/** Remove the stored member ID for a given group slug */
export function removeMemberId(slug: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(slug));
}
