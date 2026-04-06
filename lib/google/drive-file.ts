import { createGoogleOAuth2Client } from "@/lib/google/oauth-factory";

const FILE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function sanitizeDriveFileId(id: string | null | undefined): string | null {
  if (!id || !FILE_ID_RE.test(id)) return null;
  return id;
}

export type DriveFileMeta = {
  name: string;
  mimeType: string;
  thumbnailLink?: string | null;
};

export async function getDriveFileMeta(
  refreshToken: string,
  fileId: string,
): Promise<DriveFileMeta> {
  const oauth2 = createGoogleOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2.getAccessToken();
  if (!token) throw new Error("No Google access token.");

  const url = new URL(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
  );
  url.searchParams.set("fields", "name,mimeType,thumbnailLink");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    name?: string;
    mimeType?: string;
    thumbnailLink?: string | null;
    error?: { message: string };
  };
  if (!res.ok || !data.name || !data.mimeType) {
    throw new Error(data.error?.message || "Could not read Drive file metadata.");
  }
  return {
    name: data.name,
    mimeType: data.mimeType,
    thumbnailLink: data.thumbnailLink ?? null,
  };
}

/** Drive preview image (e.g. video thumbnail); may need OAuth. */
export async function fetchDriveThumbnailBuffer(
  refreshToken: string,
  thumbnailLink: string,
): Promise<ArrayBuffer | null> {
  const oauth2 = createGoogleOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2.getAccessToken();
  const res = await fetch(thumbnailLink, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.arrayBuffer();
}

export async function fetchDriveFileBuffer(
  refreshToken: string,
  fileId: string,
): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const oauth2 = createGoogleOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2.getAccessToken();
  if (!token) throw new Error("No Google access token.");

  const url = new URL(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
  );
  url.searchParams.set("alt", "media");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Could not download file from Google Drive.");
  }
  const buffer = await res.arrayBuffer();
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";
  return { buffer, contentType };
}
