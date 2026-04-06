const KNOWN: Record<string, string> = {
  missing_code: "That sign-in link was invalid or expired. Please try again.",
  supabase_not_configured:
    "Sign-in isn’t available on this site right now. Try again later or contact support.",
};

export function formatAuthCallbackError(raw: string): string {
  const key = raw.trim();
  if (KNOWN[key]) return KNOWN[key];
  try {
    return decodeURIComponent(key.replace(/\+/g, " "));
  } catch {
    return key;
  }
}
