// Google Drive API helpers: OAuth, list images/videos, download file.

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

const VIDEO_MIMES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
  "video/x-msvideo", // .avi
  "video/gif",       // animated GIF as video
];

/** All mime types we support for posts (images + videos/GIFs). */
const MEDIA_MIMES = [...IMAGE_MIMES, ...VIDEO_MIMES];

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

/** List image and video files in a folder (for posts). folderId can be 'root' for My Drive root. */
export async function listMediaInFolder(
  accessToken: string,
  folderId: string
): Promise<ListImagesResult> {
  const mimeConditions = MEDIA_MIMES.map((m) => `mimeType='${m}'`).join(" or ");
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

/** @deprecated Use listMediaInFolder. Kept for compatibility. */
export const listImagesInFolder = listMediaInFolder;

export interface DriveFolderItem {
  id: string;
  name: string;
}

export interface ListFolderContentsResult {
  folders: DriveFolderItem[];
  files: DriveFileItem[];
  error?: string;
}

/** List subfolders and media files in a folder for browsing. folderId can be 'root'. */
export async function listFolderContents(
  accessToken: string,
  folderId: string
): Promise<ListFolderContentsResult> {
  const parentQ = folderId === "root" ? "'root' in parents" : `'${folderId}' in parents`;
  const folderQ = `${parentQ} and mimeType='application/vnd.google-apps.folder'`;
  const folderParams = new URLSearchParams({
    q: folderQ,
    fields: "files(id,name)",
    pageSize: "100",
    orderBy: "name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const folderRes = await fetch(`${DRIVE_API}/files?${folderParams.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const folderData = (await folderRes.json()) as { files?: { id: string; name: string }[]; error?: { message?: string } };
  if (!folderRes.ok) {
    return { folders: [], files: [], error: folderData.error?.message ?? `Drive API error ${folderRes.status}` };
  }
  const folders: DriveFolderItem[] = (folderData.files ?? []).map((f) => ({ id: f.id, name: f.name }));

  const mimeConditions = MEDIA_MIMES.map((m) => `mimeType='${m}'`).join(" or ");
  const fileQ = `${parentQ} and (${mimeConditions})`;
  const fileParams = new URLSearchParams({
    q: fileQ,
    fields: "files(id,name,mimeType,thumbnailLink,webViewLink)",
    pageSize: "100",
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const fileRes = await fetch(`${DRIVE_API}/files?${fileParams.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const fileData = (await fileRes.json()) as { files?: DriveFileItem[]; error?: { message?: string } };
  if (!fileRes.ok) {
    return { folders, files: [], error: fileData.error?.message ?? `Drive API error ${fileRes.status}` };
  }
  return { folders, files: fileData.files ?? [] };
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
