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

        if (session) {
          router.replace("/dashboard");
        }
      } catch {
        // ignore failures and keep showing marketing page for anonymous users
      }
    }

    syncSession();
  }, [router]);

  return null;
}
