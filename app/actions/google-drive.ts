"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function disconnectGoogleDrive() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/main");

  await supabase.from("google_drive_accounts").delete().eq("user_id", user.id);

  revalidatePath("/dashboard/main");
  redirect("/dashboard/main?google=disconnected");
}
