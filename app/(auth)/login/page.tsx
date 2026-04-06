import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForms } from "@/components/auth/auth-forms";
import { sanitizeNextParam } from "@/lib/auth/safe-next";

type Props = {
  searchParams: Promise<{ mode?: string; next?: string; error?: string }>;
};

function modeFromQuery(raw: string | undefined): "login" | "signup" | "forgot" {
  if (raw === "signup" || raw === "forgot") return raw;
  return "login";
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { mode } = await searchParams;
  const m = modeFromQuery(mode);
  const titles: Record<typeof m, string> = {
    login: "Log in",
    signup: "Sign up",
    forgot: "Reset password",
  };
  return { title: titles[m] };
}

function AuthFormsFallback() {
  return (
    <div className="w-full max-w-md space-y-6 animate-pulse" aria-hidden>
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-12 w-full rounded-xl bg-slate-200" />
      <div className="h-10 w-full rounded-xl bg-slate-200" />
      <div className="h-10 w-full rounded-xl bg-slate-200" />
      <div className="h-11 w-full rounded-xl bg-slate-200" />
    </div>
  );
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const initialMode = modeFromQuery(sp.mode);
  const nextParam = sanitizeNextParam(sp.next);
  const initialAuthError =
    typeof sp.error === "string" && sp.error.length > 0 ? sp.error : null;

  return (
    <Suspense fallback={<AuthFormsFallback />}>
      <AuthForms
        initialMode={initialMode}
        nextParam={nextParam}
        initialAuthError={initialAuthError}
      />
    </Suspense>
  );
}
