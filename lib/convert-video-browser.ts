/**
 * Convert video to Instagram-compatible MP4 in the browser using FFmpeg.wasm.
 * Only import/call this from client components (e.g. dashboard). Do not use on the server.
 */

const CORE_VERSION = "0.12.6";
const BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;
const INPUT_NAME = "input_video";
const OUTPUT_NAME = "output_instagram.mp4";

export type ConvertVideoResult = { ok: true; blob: Blob } | { ok: false; error: string };

/**
 * Fetch video from URL, convert to H.264/AAC MP4 (Instagram-compatible), return as Blob.
 * Runs in the browser. Video URL must be CORS-accessible (e.g. same origin or Supabase public URL).
 */
export async function convertVideoForInstagramInBrowser(videoUrl: string): Promise<ConvertVideoResult> {
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
