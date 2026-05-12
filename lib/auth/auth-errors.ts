const KNOWN: Record<string, string> = {
  missing_code: "That sign-in link was invalid or expired. Please try again.",
  supabase_not_configured:
    "Sign-in isn’t available on this site right now. Try again later or contact support.",
};

export type AuthFormFlow = "login" | "signup" | "forgot";

/**
 * Maps auth provider errors to short, user-safe copy (no vendor names, infra details, or raw API text).
 */
export function formatAuthUserMessage(
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
    if (flow === "signup") {
      return "Too many sign-up attempts right now. Please wait a while, then try again.";
    }
    if (flow === "forgot") {
      return "Too many reset attempts right now. Please wait a while, then try again.";
    }
    return "Too many sign-in attempts right now. Please wait a while, then try again.";
  }

  if (status === 400 && lower.includes("invalid login credentials")) {
    return "Wrong email or password. If you just created an account, confirm your email from the message we sent, then try logging in.";
  }

  if (
    lower.includes("already registered") ||
    lower.includes("user already registered") ||
    lower.includes("email address is already registered")
  ) {
    return "This email may already be in use. Try logging in, or use a different email.";
  }

  if (
    lower.includes("email not confirmed") ||
    (lower.includes("not confirmed") && lower.includes("email"))
  ) {
    return "Please confirm your email from the link we sent, then try logging in.";
  }

  if (lower.includes("password") && lower.includes("least")) {
    return "Your password does not meet the requirements. Please adjust it and try again.";
  }

  return "Something went wrong. Please try again later.";
}

export function formatAuthCallbackError(raw: string): string {
  const key = raw.trim();
  if (KNOWN[key]) return KNOWN[key];
  try {
    const decoded = decodeURIComponent(key.replace(/\+/g, " "));
    if (KNOWN[decoded]) return KNOWN[decoded];
  } catch {
    /* ignore */
  }
  return "That link could not be used. Please try signing in again.";
}
