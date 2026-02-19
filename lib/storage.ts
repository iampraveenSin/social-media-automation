/**
 * Supabase Storage uploads — server only (API routes). Uses getSupabase() = service_role.
 * Never upload from the frontend (anon → RLS blocks). Frontend sends FormData to /api/upload.
 */
import { getSupabase } from "./supabase";

const BUCKET = "uploads";

/** Ensure the uploads bucket exists and is public. Tries to create if missing. */
export async function ensureUploadsBucket(): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase not configured" };
  const { error } = await sb.storage.createBucket(BUCKET, { public: true });
  if (!error) return { ok: true };
  const msg = error.message ?? String(error);
  if (msg.toLowerCase().includes("already exists")) return { ok: true };
  console.warn("[storage] createBucket:", msg);
  return { ok: false, error: msg };
}

export type UploadResult = { url: string } | { url: null; error: string };

/**
 * Upload a file to Supabase Storage and return its public URL or error.
 */
export async function uploadToSupabaseStorage(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const sb = getSupabase();
  if (!sb) return { url: null, error: "Supabase not configured" };

  const ensured = await ensureUploadsBucket();
  if (!ensured.ok && ensured.error && !ensured.error.toLowerCase().includes("already")) {
    return { url: null, error: ensured.error };
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const { data, error } = await sb.storage
    .from(BUCKET)
    .upload(safeName, buffer, { contentType, upsert: true });
  if (error) {
    const msg = error.message ?? String(error);
    console.error("[storage] upload error:", msg);
    if (msg.includes("Bucket not found") || msg.includes("not found")) {
      return { url: null, error: "Create an 'uploads' bucket in Supabase Dashboard → Storage (set it to Public)." };
    }
    return { url: null, error: msg };
  }
  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(data.path);
  const url = urlData?.publicUrl ?? null;
  return url ? { url } : { url: null, error: "Could not get public URL" };
}
