/**
 * Video placement for Instagram: all videos are posted to Feed (VIDEO).
 * No duration checks or trimming.
 */

export type InstagramVideoPlacement = "reels" | "video";

export interface ResolveVideoResult {
  url: string;
  placement: InstagramVideoPlacement;
}

export async function resolveVideoForPublish(mediaUrl: string): Promise<ResolveVideoResult> {
  return { url: mediaUrl, placement: "video" };
}
