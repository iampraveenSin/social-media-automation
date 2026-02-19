// Phase 1 MVP types for Social Media Automation Platform

/** App-level user (multi-tenant). */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export type NicheCategory =
  | "photography"
  | "restaurant"
  | "tech"
  | "fitness"
  | "motivation"
  | "fashion"
  | "education"
  | "other";

export interface ContentPersonalityProfile {
  niche: NicheCategory;
  keywords: string[];
  tone: "professional" | "casual" | "inspirational" | "educational" | "mixed";
  hashtagClusters: string[][];
}

export interface MediaItem {
  id: string;
  filename: string;
  path: string;
  url: string;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt: string;
  userId?: string;
  /** Set when image was picked from Google Drive; used for round-robin "no repeat until all posted". */
  driveFileId?: string;
}

export interface LogoConfig {
  url: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "center";
  sizePercent: number;
  opacity: number;
}

export interface ScheduledPost {
  id: string;
  mediaId: string;
  mediaUrl: string;
  caption: string;
  hashtags: string[];
  topic?: string;
  vibe?: string;
  audience?: string;
  logoConfig?: LogoConfig | null;
  scheduledAt: string;
  publishedAt?: string | null;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  /** Facebook/Meta user id (for publishing). */
  userId?: string;
  /** App user id (multi-tenant owner). */
  appUserId?: string;
  createdAt: string;
  instagramMediaId?: string | null;
  error?: string | null;
}

export interface InstagramAccount {
  id: string;
  /** Facebook/Meta user id (from OAuth). */
  userId: string;
  /** App user id (multi-tenant owner). */
  appUserId: string;
  instagramBusinessAccountId: string;
  facebookPageId?: string;
  username: string;
  accessToken: string;
  connectedAt: string;
  /** Auto-detected from profile (bio, username). Used to set niche for captions. */
  suggestedNiche?: string;
  analyzedAt?: string;
}

export interface CaptionGenerationResult {
  caption: string;
  hashtags: string[];
  cta?: string;
}

export interface DriveAccount {
  accessToken: string;
  refreshToken: string;
  folderId?: string;
  connectedAt: string;
}
