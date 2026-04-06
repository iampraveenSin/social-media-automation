/**
 * URL + anon/publishable key for browser and proxy (Next.js public env).
 * Supports both legacy anon key and newer publishable key names.
 */
export function getSupabasePublicConfig(): {
  url: string;
  anonKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabasePublicConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}
