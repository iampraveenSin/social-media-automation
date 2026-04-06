"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAuthCallbackError } from "@/lib/auth/auth-errors";
import { authHref, sanitizeRedirectPath } from "@/lib/auth/safe-next";
import { isSupabasePublicConfigured } from "@/lib/env/supabase-public";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot";

function isMode(v: string | null): v is Mode {
  return v === "login" || v === "signup" || v === "forgot";
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForms({
  initialMode,
  nextParam,
  initialAuthError,
}: {
  initialMode: Mode;
  nextParam: string | null;
  initialAuthError?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  const next = nextParam;
  const afterLoginPath = useMemo(
    () => sanitizeRedirectPath(next ?? "/dashboard/main"),
    [next],
  );

  const syncModeFromUrl = useCallback(() => {
    const raw = searchParams.get("mode");
    setMode(isMode(raw) ? raw : "login");
  }, [searchParams]);

  useEffect(() => {
    syncModeFromUrl();
  }, [syncModeFromUrl]);

  useEffect(() => {
    if (initialAuthError) {
      setFormError(formatAuthCallbackError(initialAuthError));
    }
  }, [initialAuthError]);

  const loginHref = useMemo(() => authHref("/login", { next }), [next]);
  const signupHref = useMemo(
    () => authHref("/login", { mode: "signup", next }),
    [next],
  );
  const forgotHref = useMemo(
    () => authHref("/login", { mode: "forgot", next }),
    [next],
  );

  const configured = isSupabasePublicConfigured();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setFormError("Sign-in isn’t available on this site right now. Try again later or contact support.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !emailRe.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    router.push(afterLoginPath);
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setFormError("Sign-up isn’t available on this site right now. Try again later or contact support.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (!email || !emailRe.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setFormError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(afterLoginPath)}`;

    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: name
          ? { full_name: name, display_name: name }
          : undefined,
      },
    });
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    if (data.session) {
      router.push(afterLoginPath);
      router.refresh();
      return;
    }
    setInfo(
      "Check your email for a confirmation link. After you confirm, you can log in.",
    );
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setInfo(null);
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setFormError("Password reset isn’t available on this site right now. Try again later or contact support.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email || !emailRe.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`;

    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setInfo(
      "If an account exists for that email, you will receive a reset link shortly.",
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-900 transition hover:text-indigo-600"
        >
          ← Prnit
        </Link>
        {next ? (
          <span className="truncate text-xs text-slate-500" title={next}>
            After auth: {next}
          </span>
        ) : null}
      </div>

      {!configured ? (
        <p
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          This site isn&apos;t fully configured for sign-in yet. If you manage
          Prnit, check your project setup guide. Otherwise try again later or
          contact the person who runs this app.
        </p>
      ) : null}

      <div className="mb-8 inline-flex rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => {
            router.push(loginHref);
            setMode("login");
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            mode === "login"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => {
            router.push(signupHref);
            setMode("signup");
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            mode === "signup"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Sign up
        </button>
      </div>

      {mode === "login" ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Log in to open your dashboard and connected accounts.
          </p>
          <form className="mt-8 space-y-5" onSubmit={handleLogin} noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <Link
                  href={forgotHref}
                  onClick={() => setMode("forgot")}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  name="password"
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-11 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {formError ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-800">
                {info}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/30 transition hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-60"
            >
              {pending ? "Please wait…" : "Log in"}
            </button>
          </form>
        </>
      ) : null}

      {mode === "signup" ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Start scheduling posts from Drive with AI captions.
          </p>
          <form className="mt-8 space-y-5" onSubmit={handleSignup} noValidate>
            <div>
              <label
                htmlFor="signup-name"
                className="block text-sm font-medium text-slate-700"
              >
                Name{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                placeholder="Alex Creator"
              />
            </div>
            <div>
              <label
                htmlFor="signup-email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label
                htmlFor="signup-password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="signup-password"
                  name="password"
                  type={showSignupPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-11 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                >
                  {showSignupPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="signup-confirm"
                className="block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="signup-confirm"
                  name="confirm"
                  type={showSignupConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-11 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                  aria-label={showSignupConfirm ? "Hide password" : "Show password"}
                >
                  {showSignupConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {formError ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-800">
                {info}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/30 transition hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-60"
            >
              {pending ? "Please wait…" : "Create account"}
            </button>
            <p className="text-center text-xs text-slate-500">
              By continuing you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium text-indigo-600 underline"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-indigo-600 underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </>
      ) : null}

      {mode === "forgot" ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;ll email you a link to set a new password.
          </p>
          <form className="mt-8 space-y-5" onSubmit={handleForgot} noValidate>
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm outline-none ring-indigo-500/0 transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                placeholder="you@company.com"
              />
            </div>
            {formError ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            {info ? (
              <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-800">
                {info}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-indigo-600 to-indigo-700 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-500/30 transition hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-60"
            >
              {pending ? "Please wait…" : "Send reset link"}
            </button>
            <p className="text-center text-sm text-slate-600">
              <Link
                href={loginHref}
                onClick={() => setMode("login")}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                ← Back to log in
              </Link>
            </p>
          </form>
        </>
      ) : null}
    </div>
  );
}
