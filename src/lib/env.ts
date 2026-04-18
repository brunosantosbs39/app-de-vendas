/**
 * Validated environment variables. Fails fast at module load if required
 * vars are missing so misconfigured deploys blow up immediately instead
 * of producing obscure Supabase errors later.
 */

const requiredPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

const missing = Object.entries(requiredPublicEnv)
  .filter(([, value]) => !value || value.trim() === "")
  .map(([key]) => key);

if (missing.length > 0) {
  throw new Error(
    `[env] Missing required environment variables: ${missing.join(", ")}. ` +
      `Check your .env.local — see .env.example for the expected keys.`,
  );
}

export const env = {
  SUPABASE_URL: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: requiredPublicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
};
