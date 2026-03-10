import * as z from 'zod';

const envSchema = z.object({
  PUBLIC_SUPABASE_URL: z.string().url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'PUBLIC_SUPABASE_ANON_KEY is required'),
  LASTFM_API_KEY: z.string().min(1).optional(),
});

function validateEnv() {
  const raw = {
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    LASTFM_API_KEY: import.meta.env.LASTFM_API_KEY,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    if (import.meta.env.DEV || !raw.PUBLIC_SUPABASE_URL) {
      console.warn('Missing environment variables, using empty defaults (build/dev mode)');
      return { PUBLIC_SUPABASE_URL: '', PUBLIC_SUPABASE_ANON_KEY: '', LASTFM_API_KEY: undefined };
    }
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

export const env = validateEnv();
