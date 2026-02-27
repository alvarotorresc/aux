import type { Locale } from '../../site.config';

/**
 * Normalizes a raw group code into a URL-safe slug and builds the
 * join URL with the correct locale prefix.
 *
 * @returns The full path to navigate to, or `null` when the input
 *          is empty / whitespace-only.
 */
export function buildJoinUrl(code: string, locale: Locale): string | null {
  const slug = code.toLowerCase().trim().replace(/\s+/g, '-');
  if (!slug) return null;

  const prefix = locale === 'es' ? '/es' : '';
  return `${prefix}/g/${slug}`;
}
