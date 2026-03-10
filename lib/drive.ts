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

const PAGE_SIZE = 100;
const MIME_CONDITIONS = MEDIA_MIMES.map((m) => `mimeType='${m}'`).join(" or ");

/** Fetch one page of media files in a folder. */
async function listMediaPage(
  accessToken: string,
  folderId: string,
  pageToken?: string
): Promise<{ files: DriveFileItem[]; nextPageToken?: string; error?: string }> {
  const parentQ = folderId === "root" ? "'root' in parents" : `'${folderId}' in parents`;
  const q = `${parentQ} and (${MIME_CONDITIONS}) and trashed=false`;
  const params = new URLSearchParams({
    q,
    fields: "nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink)",
    pageSize: String(PAGE_SIZE),
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    files?: DriveFileItem[];
    nextPageToken?: string;
    error?: { message?: string };
  };
  if (!res.ok) return { files: [], error: data.error?.message ?? `Drive API error ${res.status}` };
  return { files: data.files ?? [], nextPageToken: data.nextPageToken };
}

/** Fetch one page of subfolder IDs in a folder. */
async function listSubfolderIdsPage(
  accessToken: string,
  folderId: string,
  pageToken?: string
): Promise<{ folderIds: string[]; nextPageToken?: string; error?: string }> {
  const parentQ = folderId === "root" ? "'root' in parents" : `'${folderId}' in parents`;
  const q = `${parentQ} and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const params = new URLSearchParams({
    q,
    fields: "nextPageToken,files(id)",
    pageSize: String(PAGE_SIZE),
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    files?: { id: string }[];
    nextPageToken?: string;
    error?: { message?: string };
  };
  if (!res.ok) return { folderIds: [], error: data.error?.message ?? `Drive API error ${res.status}` };
  const folderIds = (data.files ?? []).map((f) => f.id).filter(Boolean);
  return { folderIds, nextPageToken: data.nextPageToken };
}

/** List all media files in a folder and all its subfolders recursively. No duplicate file IDs. */
export async function listMediaInFolderRecursive(
  accessToken: string,
  folderId: string
): Promise<ListImagesResult> {
  const seen = new Set<string>();
  const files: DriveFileItem[] = [];

  async function collectInFolder(currentFolderId: string): Promise<string | undefined> {
    let pageToken: string | undefined;
    do {
      const page = await listMediaPage(accessToken, currentFolderId, pageToken);
      if (page.error) return page.error;
      for (const f of page.files) {
        if (f.id && !seen.has(f.id)) {
          seen.add(f.id);
          files.push(f);
        }
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    let folderPageToken: string | undefined;
    do {
      const folderPage = await listSubfolderIdsPage(accessToken, currentFolderId, folderPageToken);
      if (folderPage.error) return folderPage.error;
      for (const subId of folderPage.folderIds) {
        const err = await collectInFolder(subId);
        if (err) return err;
      }
      folderPageToken = folderPage.nextPageToken;
    } while (folderPageToken);

    return undefined;
  }

  const err = await collectInFolder(folderId);
  if (err) return { files: [], error: err };
  return { files };
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

/**
 * Fetch thumbnail for a Drive file. Uses contentHints.thumbnail (base64) when present,
 * otherwise fetches thumbnailLink with Bearer token. Returns null if no thumbnail.
 */
export async function getDriveThumbnail(
  accessToken: string,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const metaRes = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=contentHints(thumbnail(image,mimeType)),thumbnailLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) return null;
  const meta = (await metaRes.json()) as {
    contentHints?: { thumbnail?: { image?: string; mimeType?: string } };
    thumbnailLink?: string;
  };

  if (meta.contentHints?.thumbnail?.image) {
    const buf = Buffer.from(meta.contentHints.thumbnail.image, "base64");
    const mimeType = meta.contentHints.thumbnail.mimeType ?? "image/jpeg";
    return { buffer: buf, mimeType };
  }

  if (meta.thumbnailLink) {
    const thumbRes = await fetch(meta.thumbnailLink, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "follow",
    });
    if (!thumbRes.ok) return null;
    const arrayBuffer = await thumbRes.arrayBuffer();
    const contentType = thumbRes.headers.get("content-type") ?? "image/jpeg";
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: contentType.split(";")[0].trim() || "image/jpeg",
    };
  }

  return null;
}
