import { needsRasterPreviewConversion } from "@/lib/composer/needs-browser-preview";

export type UploadComposerItem = {
  kind: "upload";
  id: string;
  file: File;
  previewUrl: string;
};

/** Builds an upload item with a preview URL browsers can render (HEIC → JPEG via API). */
export async function createUploadComposerItem(
  file: File,
  id: string,
): Promise<UploadComposerItem> {
  if (needsRasterPreviewConversion(file.type, file.name)) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/media/compose-preview", {
      method: "POST",
      body: fd,
      credentials: "same-origin",
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      const detail = j?.error ?? "Could not prepare image preview.";
      if (res.status === 413) {
        throw new Error(
          "File is too large for preview on this plan. Try a smaller export or JPEG.",
        );
      }
      throw new Error(detail);
    }
    const blob = await res.blob();
    const previewUrl = URL.createObjectURL(blob);
    return { kind: "upload", id, file, previewUrl };
  }

  return {
    kind: "upload",
    id,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}
