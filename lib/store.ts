// Single store API: uses Supabase when configured, otherwise file-based.
// All data is scoped by appUserId for multi-tenant SaaS.

import { isSupabaseConfigured } from "./supabase";
import * as supabaseStore from "./store-supabase";
import * as fileStore from "./store-file";
import type { ScheduledPost, MediaItem, InstagramAccount, DriveAccount, User, RecurrenceSettings } from "./types";

const useSupabase = (): boolean => isSupabaseConfigured();

// Users
export async function getUsers(): Promise<User[]> {
  return useSupabase() ? supabaseStore.getUsers() : fileStore.getUsers();
}

export async function getUserById(id: string): Promise<User | null> {
  return useSupabase() ? supabaseStore.getUserById(id) : fileStore.getUserById(id);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  return useSupabase() ? supabaseStore.getUserByEmail(email) : fileStore.getUserByEmail(email);
}

export async function createUser(user: User): Promise<void> {
  return useSupabase() ? supabaseStore.createUser(user) : fileStore.createUser(user);
}

// Posts
export async function getPosts(appUserId: string): Promise<ScheduledPost[]> {
  return useSupabase() ? supabaseStore.getPosts(appUserId) : fileStore.getPosts(appUserId);
}

export async function getPost(id: string, appUserId: string): Promise<ScheduledPost | null> {
  return useSupabase() ? supabaseStore.getPost(id, appUserId) : fileStore.getPost(id, appUserId);
}

export async function savePost(post: ScheduledPost): Promise<void> {
  return useSupabase() ? supabaseStore.savePost(post) : fileStore.savePost(post);
}

export async function deletePost(id: string, appUserId: string): Promise<boolean> {
  return useSupabase() ? supabaseStore.deletePost(id, appUserId) : fileStore.deletePost(id, appUserId);
}

// Media
export async function getMedia(appUserId: string): Promise<MediaItem[]> {
  return useSupabase() ? supabaseStore.getMedia(appUserId) : fileStore.getMedia(appUserId);
}

export async function getMediaItem(id: string, appUserId: string): Promise<MediaItem | null> {
  return useSupabase() ? supabaseStore.getMediaItem(id, appUserId) : fileStore.getMediaItem(id, appUserId);
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  return useSupabase() ? supabaseStore.saveMediaItem(item) : fileStore.saveMediaItem(item);
}

// Accounts (Instagram)
export async function getAccounts(appUserId: string): Promise<InstagramAccount[]> {
  return useSupabase() ? supabaseStore.getAccounts(appUserId) : fileStore.getAccounts(appUserId);
}

export async function saveAccount(account: InstagramAccount): Promise<void> {
  return useSupabase() ? supabaseStore.saveAccount(account) : fileStore.saveAccount(account);
}

export async function getAccountByUserId(metaUserId: string): Promise<InstagramAccount | null> {
  return useSupabase() ? supabaseStore.getAccountByUserId(metaUserId) : fileStore.getAccountByUserId(metaUserId);
}

export async function deleteAccount(id: string, appUserId: string): Promise<boolean> {
  return useSupabase() ? supabaseStore.deleteAccount(id, appUserId) : fileStore.deleteAccount(id, appUserId);
}

// Drive
export async function getDriveAccount(appUserId: string): Promise<DriveAccount | null> {
  return useSupabase() ? supabaseStore.getDriveAccount(appUserId) : fileStore.getDriveAccount(appUserId);
}

export async function saveDriveAccount(appUserId: string, account: DriveAccount | null): Promise<void> {
  return useSupabase() ? supabaseStore.saveDriveAccount(appUserId, account) : fileStore.saveDriveAccount(appUserId, account);
}

// Drive posted round
export async function getDrivePostedRound(appUserId: string, folderId: string | null | undefined): Promise<string[]> {
  return useSupabase() ? supabaseStore.getDrivePostedRound(appUserId, folderId) : fileStore.getDrivePostedRound(appUserId, folderId);
}

export async function addDrivePostedRound(
  appUserId: string,
  folderId: string | null | undefined,
  fileIds: string[]
): Promise<void> {
  return useSupabase()
    ? supabaseStore.addDrivePostedRound(appUserId, folderId, fileIds)
    : fileStore.addDrivePostedRound(appUserId, folderId, fileIds);
}

export async function clearDrivePostedRound(appUserId: string, folderId: string | null | undefined): Promise<void> {
  return useSupabase() ? supabaseStore.clearDrivePostedRound(appUserId, folderId) : fileStore.clearDrivePostedRound(appUserId, folderId);
}

// Recurrence
export async function getRecurrenceSettings(appUserId: string): Promise<RecurrenceSettings | null> {
  return useSupabase() ? supabaseStore.getRecurrenceSettings(appUserId) : fileStore.getRecurrenceSettings(appUserId);
}

export async function saveRecurrenceSettings(appUserId: string, settings: RecurrenceSettings): Promise<void> {
  return useSupabase()
    ? supabaseStore.saveRecurrenceSettings(appUserId, settings)
    : fileStore.saveRecurrenceSettings(appUserId, settings);
}

export async function getDueRecurrenceSettings(now: Date): Promise<RecurrenceSettings[]> {
  return useSupabase() ? supabaseStore.getDueRecurrenceSettings(now) : fileStore.getDueRecurrenceSettings(now);
}
