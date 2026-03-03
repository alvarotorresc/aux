import * as z from 'zod';

const envSchema = z.object({
  PUBLIC_SUPABASE_URL: z.url(),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'PUBLIC_SUPABASE_ANON_KEY is required'),
  LASTFM_API_KEY: z.string().min(1).optional(),
});

function validateEnv() {
  const result = envSchema.safeParse({
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    LASTFM_API_KEY: import.meta.env.LASTFM_API_KEY,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

export const env = validateEnv();
