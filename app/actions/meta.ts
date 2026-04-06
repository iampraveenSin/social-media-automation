"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchManagedPages } from "@/lib/meta/graph";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function selectMetaPage(formData: FormData) {
  const pageId = formData.get("pageId");
  if (typeof pageId !== "string" || !pageId) {
    redirect("/dashboard/main?facebook=page_error");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/main");

  const { data: row } = await supabase
    .from("meta_accounts")
    .select("user_access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.user_access_token) {
    redirect("/dashboard/main?facebook=page_error");
  }

  let pages;
  try {
    pages = await fetchManagedPages(row.user_access_token);
  } catch {
    redirect("/dashboard/main?facebook=page_error");
  }

  const page = pages.find((p) => p.id === pageId);
  if (!page) redirect("/dashboard/main?facebook=page_error");

  const ig = page.instagram_business_account;

  const { error } = await supabase
    .from("meta_accounts")
    .update({
      selected_page_id: page.id,
      selected_page_name: page.name,
      page_access_token: page.access_token,
      instagram_account_id: ig?.id ?? null,
      instagram_username: ig?.username ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) redirect("/dashboard/main?facebook=page_error");

  revalidatePath("/dashboard/main");
  redirect("/dashboard/main?facebook=page_connected");
}

export async function disconnectMeta() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/main");

  await supabase.from("meta_accounts").delete().eq("user_id", user.id);

  revalidatePath("/dashboard/main");
  redirect("/dashboard/main?facebook=disconnected");
}
