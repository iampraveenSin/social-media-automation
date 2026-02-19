import { getSupabase } from "./supabase";
import type { ScheduledPost, MediaItem, InstagramAccount, DriveAccount, User } from "./types";

function requireAppUserId(appUserId: string | null | undefined): string {
  if (!appUserId || typeof appUserId !== "string") throw new Error("Unauthorized");
  return appUserId;
}

// ---- Users ----
export async function getUsers(): Promise<User[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("users").select("id,email,password_hash,created_at").order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    createdAt: r.created_at,
  }));
}

export async function getUserById(id: string): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("users").select("id,email,password_hash,created_at").eq("id", id).single();
  if (error || !data) return null;
  return { id: data.id, email: data.email, passwordHash: data.password_hash, createdAt: data.created_at };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const normalized = email.trim().toLowerCase();
  const { data, error } = await sb
    .from("users")
    .select("id,email,password_hash,created_at")
    .ilike("email", normalized)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, email: data.email, passwordHash: data.password_hash, createdAt: data.created_at };
}

export async function createUser(user: User): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("users").insert({
    id: user.id,
    email: user.email.trim().toLowerCase(),
    password_hash: user.passwordHash,
    created_at: user.createdAt,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Email already registered");
    throw error;
  }
}

// ---- Posts ----
function rowToPost(r: Record<string, unknown>): ScheduledPost {
  return {
    id: r.id as string,
    mediaId: r.media_id as string,
    mediaUrl: r.media_url as string,
    caption: (r.caption as string) ?? "",
    hashtags: Array.isArray(r.hashtags) ? (r.hashtags as string[]) : [],
    topic: r.topic as string | undefined,
    vibe: r.vibe as string | undefined,
    audience: r.audience as string | undefined,
    logoConfig: (r.logo_config as ScheduledPost["logoConfig"]) ?? null,
    scheduledAt: r.scheduled_at as string,
    publishedAt: (r.published_at as string | null) ?? null,
    status: (r.status as ScheduledPost["status"]) ?? "draft",
    userId: r.user_id as string | undefined,
    appUserId: r.app_user_id as string | undefined,
    createdAt: r.created_at as string,
    instagramMediaId: (r.instagram_media_id as string | null) ?? null,
    error: (r.error as string | null) ?? null,
  };
}

export async function getPosts(appUserId: string): Promise<ScheduledPost[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("posts").select("*").eq("app_user_id", appUserId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToPost);
}

export async function getPost(id: string, appUserId: string): Promise<ScheduledPost | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("posts").select("*").eq("id", id).eq("app_user_id", appUserId).single();
  if (error || !data) return null;
  return rowToPost(data as Record<string, unknown>);
}

export async function savePost(post: ScheduledPost): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const row = {
    id: post.id,
    app_user_id: post.appUserId ?? null,
    media_id: post.mediaId,
    media_url: post.mediaUrl,
    caption: post.caption,
    hashtags: post.hashtags,
    topic: post.topic ?? null,
    vibe: post.vibe ?? null,
    audience: post.audience ?? null,
    logo_config: post.logoConfig ?? null,
    scheduled_at: post.scheduledAt,
    published_at: post.publishedAt ?? null,
    status: post.status,
    user_id: post.userId ?? null,
    created_at: post.createdAt,
    instagram_media_id: post.instagramMediaId ?? null,
    error: post.error ?? null,
  };
  const { error: upsertError } = await sb.from("posts").upsert(row, { onConflict: "id" });
  if (upsertError) throw upsertError;
}

export async function deletePost(id: string, appUserId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data, error } = await sb.from("posts").delete().eq("id", id).eq("app_user_id", appUserId).select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// ---- Media ----
function rowToMedia(r: Record<string, unknown>): MediaItem {
  return {
    id: r.id as string,
    filename: r.filename as string,
    path: r.path as string,
    url: r.url as string,
    mimeType: (r.mime_type as string) ?? "image/jpeg",
    width: r.width as number | undefined,
    height: r.height as number | undefined,
    uploadedAt: r.uploaded_at as string,
    userId: r.user_id as string | undefined,
    driveFileId: r.drive_file_id as string | undefined,
  };
}

export async function getMedia(appUserId: string): Promise<MediaItem[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("media").select("*").eq("user_id", appUserId).order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => rowToMedia(d as Record<string, unknown>));
}

export async function getMediaItem(id: string, appUserId: string): Promise<MediaItem | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("media").select("*").eq("id", id).eq("user_id", appUserId).single();
  if (error || !data) return null;
  return rowToMedia(data as Record<string, unknown>);
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const row = {
    id: item.id,
    user_id: item.userId ?? null,
    filename: item.filename,
    path: item.path,
    url: item.url,
    mime_type: item.mimeType,
    width: item.width ?? null,
    height: item.height ?? null,
    uploaded_at: item.uploadedAt,
    drive_file_id: item.driveFileId ?? null,
  };
  const { error } = await sb.from("media").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

// ---- Accounts (Instagram) ----
function rowToAccount(r: Record<string, unknown>): InstagramAccount {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    appUserId: r.app_user_id as string,
    instagramBusinessAccountId: r.instagram_business_account_id as string,
    facebookPageId: r.facebook_page_id as string | undefined,
    username: r.username as string,
    accessToken: r.access_token as string,
    connectedAt: r.connected_at as string,
    suggestedNiche: r.suggested_niche as string | undefined,
    analyzedAt: r.analyzed_at as string | undefined,
  };
}

export async function getAccounts(appUserId: string): Promise<InstagramAccount[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("accounts").select("*").eq("app_user_id", appUserId);
  if (error) throw error;
  return (data ?? []).map((d) => rowToAccount(d as Record<string, unknown>));
}

export async function saveAccount(account: InstagramAccount): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const row = {
    id: account.id,
    user_id: account.userId,
    app_user_id: account.appUserId,
    instagram_business_account_id: account.instagramBusinessAccountId,
    facebook_page_id: account.facebookPageId ?? null,
    username: account.username,
    access_token: account.accessToken,
    connected_at: account.connectedAt,
    suggested_niche: account.suggestedNiche ?? null,
    analyzed_at: account.analyzedAt ?? null,
  };
  const { error } = await sb.from("accounts").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function getAccountByUserId(metaUserId: string): Promise<InstagramAccount | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("accounts").select("*").eq("user_id", metaUserId).maybeSingle();
  if (error || !data) return null;
  return rowToAccount(data as Record<string, unknown>);
}

export async function deleteAccount(id: string, appUserId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data, error } = await sb.from("accounts").delete().eq("id", id).eq("app_user_id", appUserId).select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// ---- Drive ----
export async function getDriveAccount(appUserId: string): Promise<DriveAccount | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("drive_accounts").select("*").eq("app_user_id", appUserId).maybeSingle();
  if (error || !data) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    folderId: data.folder_id ?? undefined,
    connectedAt: data.connected_at,
  };
}

export async function saveDriveAccount(appUserId: string, account: DriveAccount | null): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  if (account) {
    const { error } = await sb
      .from("drive_accounts")
      .upsert(
        {
          app_user_id: appUserId,
          access_token: account.accessToken,
          refresh_token: account.refreshToken,
          folder_id: account.folderId ?? null,
          connected_at: account.connectedAt,
        },
        { onConflict: "app_user_id" }
      );
    if (error) throw error;
  } else {
    await sb.from("drive_accounts").delete().eq("app_user_id", appUserId);
  }
}

// ---- Drive posted round ----
export async function getDrivePostedRound(appUserId: string, folderId: string | null | undefined): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const key = folderId ?? "root";
  const { data, error } = await sb
    .from("drive_posted_round")
    .select("file_ids")
    .eq("app_user_id", appUserId)
    .eq("folder_id", key)
    .maybeSingle();
  if (error || !data || !Array.isArray(data.file_ids)) return [];
  return data.file_ids.filter((x): x is string => typeof x === "string");
}

export async function addDrivePostedRound(
  appUserId: string,
  folderId: string | null | undefined,
  fileIds: string[]
): Promise<void> {
  if (fileIds.length === 0) return;
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const key = folderId ?? "root";
  const existing = await getDrivePostedRound(appUserId, folderId);
  const merged = [...new Set([...existing, ...fileIds])];
  const { error } = await sb
    .from("drive_posted_round")
    .upsert({ app_user_id: appUserId, folder_id: key, file_ids: merged }, { onConflict: "app_user_id,folder_id" });
  if (error) throw error;
}

export async function clearDrivePostedRound(appUserId: string, folderId: string | null | undefined): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const key = folderId ?? "root";
  await sb.from("drive_posted_round").delete().eq("app_user_id", appUserId).eq("folder_id", key);
}
