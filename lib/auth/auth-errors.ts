const KNOWN: Record<string, string> = {
  missing_code: "That sign-in link was invalid or expired. Please try again.",
  supabase_not_configured:
    "Sign-in isn’t available on this site right now. Try again later or contact support.",
};

export type AuthFormFlow = "login" | "signup" | "forgot";

/** Maps GoTrue / Supabase Auth errors to clearer copy (rate limits, etc.). */
export function formatSupabaseAuthUserMessage(
  error: {
    message: string;
    status?: number;
  },
  flow: AuthFormFlow = "login",
): string {
  const raw = (error.message ?? "").trim();
  const lower = raw.toLowerCase();
  const status = error.status;

  const isRateLimited =
    status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("email rate limit");

  if (isRateLimited) {
    const base =
      "Supabase returned HTTP 429 (rate limit). This is enforced on Supabase’s servers — the app cannot bypass it. ";
    const wait =
      "Wait at least 30–60 minutes (sometimes up to a few hours on busy IPs), then try once. ";
    const owner =
      "Project owner: Supabase Dashboard → your project → Authentication → open Rate limits / Attack protection / Email settings (labels vary by Supabase version) and raise limits if your plan allows. ";
    const ip =
      "Same Wi‑Fi / office / VPN IP counts for everyone — retries add up quickly.";

    if (flow === "signup") {
      return (
        base +
        "Sign-up sends a confirmation email, which counts toward email rate limits. " +
        wait +
        owner +
        ip
      );
    }
    if (flow === "forgot") {
      return (
        base +
        "Password reset emails count toward the same limits. " +
        wait +
        owner +
        ip
      );
    }
    return base + wait + owner + ip;
  }

  if (status === 400 && lower.includes("invalid login credentials")) {
    return "Wrong email or password. If you just signed up, confirm your email from the inbox first, then log in.";
  }

  return raw;
}

export function formatAuthCallbackError(raw: string): string {
  const key = raw.trim();
  if (KNOWN[key]) return KNOWN[key];
  try {
    return decodeURIComponent(key.replace(/\+/g, " "));
  } catch {
    return key;
  }
}
