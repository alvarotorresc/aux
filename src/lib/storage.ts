const STORAGE_PREFIX = 'aux:members';

// UUID v4 pattern — the only shape a valid Supabase row ID can have
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Slug is alphanumeric + hyphens, max 80 chars (mirrors DB constraint)
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$|^[a-z0-9]$/;

function storageKey(slug: string): string {
  // Sanitise slug before embedding it in the key to prevent localStorage key injection
  const safeSlug = slug.replace(/[^a-z0-9-]/g, '').slice(0, 80);
  return `${STORAGE_PREFIX}:${safeSlug}`;
}

/** Read the stored member ID for a given group slug, returning null if invalid */
export function getMemberId(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  if (!SLUG_RE.test(slug)) return null;
  const value = localStorage.getItem(storageKey(slug));
  if (!value || !UUID_RE.test(value)) return null;
  return value;
}

/** Store the member ID for a given group slug */
export function setMemberId(slug: string, memberId: string): void {
  if (typeof window === 'undefined') return;
  if (!SLUG_RE.test(slug) || !UUID_RE.test(memberId)) return;
  localStorage.setItem(storageKey(slug), memberId);
}

/** Remove the stored member ID for a given group slug */
export function removeMemberId(slug: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(slug));
}

// --- My groups (for quick navigation from landing) ---

const GROUPS_KEY = 'aux:my-groups';

export interface SavedGroup {
  slug: string;
  name: string;
}

/** Save a group to the user's local list (deduplicates by slug) */
export function saveMyGroup(slug: string, name: string): void {
  if (typeof window === 'undefined') return;
  const groups = getMyGroups();
  const existing = groups.findIndex((g) => g.slug === slug);
  if (existing !== -1) {
    groups[existing].name = name;
  } else {
    groups.push({ slug, name });
  }
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

/** Get all groups the user has joined */
export function getMyGroups(): SavedGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedGroup[];
  } catch {
    return [];
  }
}
