import { google } from "googleapis";
import { isCameraRawFilename } from "@/lib/composer/camera-raw";
import { createGoogleOAuth2Client } from "@/lib/google/oauth-factory";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function sanitizeDriveFolderId(folderId: string | null | undefined): string {
  const id = folderId?.trim() || "root";
  if (id === "root") return "root";
  if (/^[a-zA-Z0-9_-]+$/.test(id)) return id;
  return "root";
}

const MEDIA_OR_FOLDER =
  "mimeType contains 'image/' or mimeType contains 'video/'";

export function buildDriveListQuery(folderId: string): string {
  const id = sanitizeDriveFolderId(folderId);
  const parent = id === "root" ? "root" : id;
  return `'${parent}' in parents and trashed = false and (mimeType = '${FOLDER_MIME}' or ${MEDIA_OR_FOLDER})`;
}

export async function getDriveClientForRefreshToken(refreshToken: string) {
  const oauth2 = createGoogleOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

export type DriveFileRow = {
  id: string;
  name: string;
  mimeType: string;
  size?: string | null;
  thumbnailLink?: string | null;
};

export async function listDriveChildren(
  refreshToken: string,
  folderId: string,
  pageToken?: string | null,
): Promise<{ files: DriveFileRow[]; nextPageToken: string | null }> {
  const drive = await getDriveClientForRefreshToken(refreshToken);
  const res = await drive.files.list({
    q: buildDriveListQuery(folderId),
    pageSize: 40,
    pageToken: pageToken ?? undefined,
    fields:
      "nextPageToken, files(id, name, mimeType, size, thumbnailLink)",
    orderBy: "folder,name",
  });

  const files = (res.data.files ?? [])
    .map((f) => ({
      id: f.id!,
      name: f.name ?? "Untitled",
      mimeType: f.mimeType ?? "",
      size: f.size,
      thumbnailLink: f.thumbnailLink,
    }))
    .filter((f) => !isCameraRawFilename(f.name));

  return {
    files,
    nextPageToken: res.data.nextPageToken ?? null,
  };
}

/** Random eligible file from a shallow search (first 100 matches). */
export async function pickRandomDriveMedia(
  refreshToken: string,
  folderId?: string | null,
): Promise<DriveFileRow | null> {
  const drive = await getDriveClientForRefreshToken(refreshToken);
  const id = sanitizeDriveFolderId(folderId ?? "root");
  const parent = id === "root" ? "root" : id;
  const q =
    id === "root"
      ? `trashed = false and (${MEDIA_OR_FOLDER})`
      : `'${parent}' in parents and trashed = false and (${MEDIA_OR_FOLDER})`;
  const res = await drive.files.list({
    q,
    pageSize: 100,
    fields: "files(id, name, mimeType, thumbnailLink)",
  });
  const files = (res.data.files ?? []).filter(
    (f) => f.id && f.name && !isCameraRawFilename(f.name ?? ""),
  ) as DriveFileRow[];
  if (files.length === 0) return null;
  const i = Math.floor(Math.random() * files.length);
  return files[i] ?? null;
}
