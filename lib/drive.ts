// Google Drive API helpers: OAuth, list images, download file.

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
];

/** Use http for localhost so OAuth callback works (dev server has no HTTPS). */
function normalizeOriginForOAuth(origin: string): string {
  const base = origin.replace(/\/+$/, "");
  try {
    const u = new URL(base);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") u.protocol = "http:";
    return u.origin;
  } catch {
    return base.startsWith("https") ? base : base;
  }
}

/** baseUrl = request origin so redirect comes back to same host and session cookie is sent. Exported so callers can show the exact URI to add in Google Console. No trailing slash. */
export function getRedirectUri(baseUrl?: string): string {
  const raw = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim().replace(/\/+$/, "");
  const origin = normalizeOriginForOAuth(raw);
  return `${origin}/api/drive/callback`;
}

export function getDriveAuthUrl(baseUrl?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const redirectUri = getRedirectUri(baseUrl);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function getDriveTokensFromCode(code: string, baseUrl?: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri = getRedirectUri(baseUrl);
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };
  if (data.error || !data.access_token || !data.refresh_token) return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export async function refreshDriveAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error || !data.access_token) return null;
  return data.access_token;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

export interface ListImagesResult {
  files: DriveFileItem[];
  error?: string;
}

/** List image files in a folder. folderId can be 'root' for My Drive root. */
export async function listImagesInFolder(
  accessToken: string,
  folderId: string
): Promise<ListImagesResult> {
  const mimeConditions = IMAGE_MIMES.map((m) => `mimeType='${m}'`).join(" or ");
  const q = folderId === "root"
    ? `'root' in parents and (${mimeConditions})`
    : `'${folderId}' in parents and (${mimeConditions})`;
  const params = new URLSearchParams({
    q,
    fields: "files(id,name,mimeType,thumbnailLink,webViewLink)",
    pageSize: "100",
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const url = `${DRIVE_API}/files?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as { files?: DriveFileItem[]; error?: { message?: string; code?: number } };
  if (!res.ok) {
    const msg = data.error?.message ?? `Drive API error ${res.status}`;
    return { files: [], error: msg };
  }
  return { files: data.files ?? [] };
}

/** Download file binary from Drive. */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string; name: string } | null> {
  const metaRes = await fetch(`${DRIVE_API}/files/${fileId}?fields=name,mimeType`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) return null;
  const meta = (await metaRes.json()) as { name?: string; mimeType?: string };
  const downloadRes = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!downloadRes.ok) return null;
  const arrayBuffer = await downloadRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: meta.mimeType ?? "image/jpeg",
    name: meta.name ?? "image",
  };
}

/** Extract folder ID from a Google Drive folder URL. */
export function parseDriveFolderId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/[/]folders[/]([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;
  return null;
}
