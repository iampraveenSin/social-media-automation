"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { tryCreateBrowserSupabaseClient } from "@/lib/supabase/client";

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
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
