/**
 * Convert video to Instagram-compatible MP4 (H.264, AAC, faststart) using FFmpeg.wasm.
 * Works on Vercel and localhost (no native ffmpeg). Uses single-thread core to avoid SharedArrayBuffer.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";

const CORE_VERSION = "0.12.6";
const BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const instance = new FFmpeg();
    try {
      await instance.load({
        coreURL: `${BASE}/ffmpeg-core.js`,
        wasmURL: `${BASE}/ffmpeg-core.wasm`,
      });
      ffmpeg = instance;
      return instance;
    } catch (err) {
      loadPromise = null;
      throw err;
    }
  })();
  return loadPromise;
}

const INPUT_NAME = "input_video";
const OUTPUT_NAME = "output_instagram.mp4";

/**
 * Convert video buffer to Instagram-compatible MP4 (H.264 video, AAC audio, moov at front).
 * Returns the converted buffer or null if conversion fails (caller can use original).
 */
export async function convertVideoToInstagramFormat(
  videoBuffer: Buffer,
  mimeType?: string
): Promise<Buffer | null> {
  try {
    const ff = await getFFmpeg();
    const data = new Uint8Array(videoBuffer);
    let ext = "mp4";
    if (mimeType?.includes("quicktime") || mimeType?.includes("mov")) ext = "mov";
    else if (mimeType?.includes("webm")) ext = "webm";
    await ff.writeFile(`${INPUT_NAME}.${ext}`, data);
    await ff.exec([
      "-y",
      "-i",
      `${INPUT_NAME}.${ext}`,
      "-c:v",
      "libx264",
      "-profile:v",
      "main",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "48000",
      "-movflags",
      "+faststart",
      "-max_muxing_queue_size",
      "1024",
      OUTPUT_NAME,
    ]);
    const out = await ff.readFile(OUTPUT_NAME);
    await ff.deleteFile(`${INPUT_NAME}.${ext}`).catch(() => {});
    await ff.deleteFile(OUTPUT_NAME).catch(() => {});
    return Buffer.from(out);
  } catch (err) {
    console.warn("[video-convert] Conversion failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

