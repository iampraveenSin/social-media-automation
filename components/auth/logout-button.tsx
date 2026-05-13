"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";
import { InlineSpinner } from "@/components/ui/inline-spinner";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    const supabase = tryCreateBrowserSupabaseClient();
    if (!supabase) {
      router.push("/login");
      return;
    }
    setPending(true);
    await supabase.auth.signOut();
    setPending(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? (
        <>
          <InlineSpinner tone="slate" />
          Signing out…
        </>
      ) : (
        "Log out"
      )}
    </button>
  );
}
