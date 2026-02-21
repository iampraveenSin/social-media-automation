/**
 * Convert video to Instagram-compatible MP4 in the browser using FFmpeg.wasm.
 * Only import/call this from client components (e.g. dashboard). Do not use on the server.
 */

import type { LogoConfig } from "./types";

const CORE_VERSION = "0.12.6";
const BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
const INPUT_NAME = "input_video";
const LOGO_NAME = "logo.png";
const OUTPUT_NAME = "output_instagram.mp4";

export type ConvertVideoResult = { ok: true; blob: Blob } | { ok: false; error: string };

function getLogoOverlayFilter(config: LogoConfig): string {
  const size = Math.max(5, Math.min(30, config.sizePercent));
  const pad = 20;
  let x: string;
  let y: string;
  switch (config.position) {
    case "bottom-left":
      x = String(pad);
      y = `main_h-overlay_h-${pad}`;
      break;
    case "top-left":
      x = String(pad);
      y = String(pad);
      break;
    case "top-right":
      x = `main_w-overlay_w-${pad}`;
      y = String(pad);
      break;
    case "center":
      x = "(main_w-overlay_w)/2";
      y = "(main_h-overlay_h)/2";
      break;
    default:
      x = `main_w-overlay_w-${pad}`;
      y = `main_h-overlay_h-${pad}`;
  }
  return `[0:v][1:v]scale2ref=w='min(iw,ih)*${size}/100':h='min(iw,ih)*${size}/100'[v][logo];[v][logo]overlay=x='${x}':y='${y}'[outv]`;
}

/**
 * Fetch video from URL, convert to H.264/AAC MP4 (Instagram-compatible), optionally overlay logo, return as Blob.
 * Runs in the browser. Video URL must be CORS-accessible (e.g. same origin or Supabase public URL).
 * If logoConfig is provided, logoConfig.url must be fetchable (same origin or full URL).
 */
export async function convertVideoForInstagramInBrowser(
  videoUrl: string,
  logoConfig?: LogoConfig | null
): Promise<ConvertVideoResult> {
  try {
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);

    const ffmpeg = new FFmpeg();

    await ffmpeg.load({
      coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });

    const ext = videoUrl.toLowerCase().includes(".mov") ? "mov" : videoUrl.toLowerCase().includes(".webm") ? "webm" : "mp4";
    const inputPath = `${INPUT_NAME}.${ext}`;

    const videoData = await fetchFile(videoUrl);
    await ffmpeg.writeFile(inputPath, videoData);

    const hasLogo = logoConfig?.url && typeof window !== "undefined";
    if (hasLogo && logoConfig!.url) {
      const logoUrl =
        logoConfig!.url.startsWith("http")
          ? logoConfig!.url
          : `${window.location.origin}${logoConfig!.url.startsWith("/") ? "" : "/"}${logoConfig!.url}`;
      const logoData = await fetchFile(logoUrl);
      await ffmpeg.writeFile(LOGO_NAME, logoData);
    }

    if (hasLogo && logoConfig!.url) {
      const filter = getLogoOverlayFilter(logoConfig!);
      await ffmpeg.exec([
        "-y",
        "-i",
        inputPath,
        "-i",
        LOGO_NAME,
        "-filter_complex",
        filter,
        "-map",
        "[outv]",
        "-map",
        "0:a?",
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
      await ffmpeg.deleteFile(LOGO_NAME).catch(() => {});
    } else {
      await ffmpeg.exec([
        "-y",
        "-i",
        inputPath,
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
    }

    const out = await ffmpeg.readFile(OUTPUT_NAME);
    await ffmpeg.deleteFile(inputPath).catch(() => {});
    await ffmpeg.deleteFile(OUTPUT_NAME).catch(() => {});

    if (typeof out === "string") {
      return { ok: false, error: "Unexpected string output from converter" };
    }
    const blob = new Blob([new Uint8Array(out)], { type: "video/mp4" });
    return { ok: true, blob };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
