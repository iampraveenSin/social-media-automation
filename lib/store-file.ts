// File-based store (used when Supabase is not configured).
// On Vercel we use /tmp/.data (ephemeral).

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { ScheduledPost, MediaItem, InstagramAccount, DriveAccount, User } from "./types";

const DATA_DIR =
  process.env.VERCEL === "1" ? path.join("/tmp", ".data") : path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const MEDIA_FILE = path.join(DATA_DIR, "media.json");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
const DRIVE_FILE = path.join(DATA_DIR, "drive.json");
const DRIVE_POSTED_ROUND_FILE = path.join(DATA_DIR, "drive-posted-round.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  await ensureDataDir();
  await writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export async function getUsers(): Promise<User[]> {
  return readJson<User[]>(USERS_FILE, []);
}

export async function getUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function createUser(user: User): Promise<void> {
  const users = await getUsers();
  if (users.some((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
    throw new Error("Email already registered");
  }
  users.push(user);
  await writeJson(USERS_FILE, users);
}

export async function getPosts(appUserId: string): Promise<ScheduledPost[]> {
  const all = await readJson<ScheduledPost[]>(POSTS_FILE, []);
  return all.filter((p) => p.appUserId === appUserId);
}

export async function getPost(id: string, appUserId: string): Promise<ScheduledPost | null> {
  const posts = await getPosts(appUserId);
  return posts.find((p) => p.id === id) ?? null;
}

export async function savePost(post: ScheduledPost): Promise<void> {
  const all = await readJson<ScheduledPost[]>(POSTS_FILE, []);
  const idx = all.findIndex((p) => p.id === post.id);
  if (idx >= 0) all[idx] = post;
  else all.push(post);
  await writeJson(POSTS_FILE, all);
}

export async function deletePost(id: string, appUserId: string): Promise<boolean> {
  const all = await readJson<ScheduledPost[]>(POSTS_FILE, []);
  const filtered = all.filter((p) => !(p.id === id && p.appUserId === appUserId));
  if (filtered.length === all.length) return false;
  await writeJson(POSTS_FILE, filtered);
  return true;
}

export async function getMedia(appUserId: string): Promise<MediaItem[]> {
  const all = await readJson<MediaItem[]>(MEDIA_FILE, []);
  return all.filter((m) => m.userId === appUserId);
}

export async function getMediaItem(id: string, appUserId: string): Promise<MediaItem | null> {
  const items = await getMedia(appUserId);
  return items.find((m) => m.id === id) ?? null;
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  const all = await readJson<MediaItem[]>(MEDIA_FILE, []);
  const idx = all.findIndex((m) => m.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  await writeJson(MEDIA_FILE, all);
}

export async function getAccounts(appUserId: string): Promise<InstagramAccount[]> {
  const all = await readJson<InstagramAccount[]>(ACCOUNTS_FILE, []);
  return all.filter((a) => a.appUserId === appUserId);
}

export async function saveAccount(account: InstagramAccount): Promise<void> {
  const all = await readJson<InstagramAccount[]>(ACCOUNTS_FILE, []);
  const idx = all.findIndex((a) => a.id === account.id);
  if (idx >= 0) all[idx] = account;
  else all.push(account);
  await writeJson(ACCOUNTS_FILE, all);
}

export async function getAccountByUserId(metaUserId: string): Promise<InstagramAccount | null> {
  const all = await readJson<InstagramAccount[]>(ACCOUNTS_FILE, []);
  return all.find((a) => a.userId === metaUserId) ?? null;
}

export async function deleteAccount(id: string, appUserId: string): Promise<boolean> {
  const all = await readJson<InstagramAccount[]>(ACCOUNTS_FILE, []);
  const filtered = all.filter((a) => !(a.id === id && a.appUserId === appUserId));
  if (filtered.length === all.length) return false;
  await writeJson(ACCOUNTS_FILE, filtered);
  return true;
}

type DriveStore = Record<string, DriveAccount | null>;

export async function getDriveAccount(appUserId: string): Promise<DriveAccount | null> {
  const data = await readJson<DriveStore>(DRIVE_FILE, {});
  return data[appUserId] ?? null;
}

export async function saveDriveAccount(appUserId: string, account: DriveAccount | null): Promise<void> {
  const data = await readJson<DriveStore>(DRIVE_FILE, {});
  if (account) data[appUserId] = account;
  else delete data[appUserId];
  await writeJson(DRIVE_FILE, data);
}

type DrivePostedRoundStore = Record<string, Record<string, string[]>>;

export async function getDrivePostedRound(appUserId: string, folderId: string | null | undefined): Promise<string[]> {
  const data = await readJson<DrivePostedRoundStore>(DRIVE_POSTED_ROUND_FILE, {});
  const byUser = data[appUserId] ?? {};
  const key = folderId ?? "root";
  const list = byUser[key];
  return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
}

export async function addDrivePostedRound(
  appUserId: string,
  folderId: string | null | undefined,
  fileIds: string[]
): Promise<void> {
  if (fileIds.length === 0) return;
  const data = await readJson<DrivePostedRoundStore>(DRIVE_POSTED_ROUND_FILE, {});
  const byUser = data[appUserId] ?? {};
  const key = folderId ?? "root";
  const current = byUser[key] ?? [];
  byUser[key] = [...new Set([...current, ...fileIds])];
  data[appUserId] = byUser;
  await writeJson(DRIVE_POSTED_ROUND_FILE, data);
}

export async function clearDrivePostedRound(appUserId: string, folderId: string | null | undefined): Promise<void> {
  const data = await readJson<DrivePostedRoundStore>(DRIVE_POSTED_ROUND_FILE, {});
  const byUser = data[appUserId];
  if (!byUser) return;
  const key = folderId ?? "root";
  delete byUser[key];
  if (Object.keys(byUser).length === 0) delete data[appUserId];
  else data[appUserId] = byUser;
  await writeJson(DRIVE_POSTED_ROUND_FILE, data);
}
