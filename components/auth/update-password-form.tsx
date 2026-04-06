"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      setFormError(
        "This page isn’t available right now. Try again later or contact support.",
      );
      return;
    }
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) {
      setFormError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    router.push("/dashboard/main");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <h1 className="text-xl font-semibold text-slate-900">Set new password</h1>
      <p className="mt-2 text-sm text-slate-600">
        Choose a new password for your account.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-slate-700"
          >
            New password
          </label>
          <div className="relative mt-1.5">
            <input
              id="new-password"
              name="password"
              type={showNewPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-11 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-slate-700"
          >
            Confirm password
          </label>
          <div className="relative mt-1.5">
            <input
              id="confirm-password"
              name="confirm"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 pr-11 text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {formError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-indigo-600 underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
