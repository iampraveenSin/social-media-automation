"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ClientAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    async function syncSession() {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        await fetch("/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });
      } catch {
        // ignore failures here, but redirect if a browser session exists
      }

      router.replace("/dashboard");
    }

    syncSession();
  }, [router]);

  return null;
}
