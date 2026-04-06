import { META_GRAPH_VERSION } from "@/lib/env/meta";

const BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

function extForMime(mime: string): string {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/webp") return "webp";
  if (mime.startsWith("video/")) return "mp4";
  return "bin";
}

type GraphErr = { error?: { message?: string } };

function readGraphError(data: GraphErr, fallback: string): string {
  return data.error?.message || fallback;
}

/** Single photo (or GIF) published to the Page timeline. */
export async function publishPagePhoto(args: {
  pageId: string;
  pageAccessToken: string;
  buffer: ArrayBuffer;
  mimeType: string;
  filenameBase: string;
  message: string;
}): Promise<{ ok: true; photoId: string; postId?: string } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("access_token", args.pageAccessToken);
  if (args.message.trim()) {
    form.append("message", args.message.trim());
  }
  const ext = extForMime(args.mimeType);
  const safeName = args.filenameBase.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "media";
  form.append(
    "source",
    new Blob([args.buffer], { type: args.mimeType }),
    `${safeName}.${ext}`,
  );

  const res = await fetch(`${BASE}/${args.pageId}/photos`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const data = (await res.json()) as GraphErr & {
    id?: string;
    post_id?: string;
  };
  if (!res.ok || !data.id) {
    return { ok: false, error: readGraphError(data, "Photo publish failed.") };
  }
  return {
    ok: true,
    photoId: data.id,
    postId: data.post_id,
  };
}

/** Upload photo without publishing (for multi-photo feed). */
async function uploadUnpublishedPagePhoto(args: {
  pageId: string;
  pageAccessToken: string;
  buffer: ArrayBuffer;
  mimeType: string;
  filenameBase: string;
}): Promise<{ ok: true; photoId: string } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("access_token", args.pageAccessToken);
  form.append("published", "false");
  const ext = extForMime(args.mimeType);
  const safeName = args.filenameBase.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "media";
  form.append(
    "source",
    new Blob([args.buffer], { type: args.mimeType }),
    `${safeName}.${ext}`,
  );

  const res = await fetch(`${BASE}/${args.pageId}/photos`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const data = (await res.json()) as GraphErr & { id?: string };
  if (!res.ok || !data.id) {
    return { ok: false, error: readGraphError(data, "Photo upload failed.") };
  }
  return { ok: true, photoId: data.id };
}

/** Multi-image post via Page feed + attached unpublished photos. */
export async function publishPageMultiPhotoFeed(args: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  photos: Array<{
    buffer: ArrayBuffer;
    mimeType: string;
    filenameBase: string;
  }>;
}): Promise<{ ok: true; postId?: string } | { ok: false; error: string }> {
  const ids: string[] = [];
  for (const p of args.photos) {
    const up = await uploadUnpublishedPagePhoto({
      pageId: args.pageId,
      pageAccessToken: args.pageAccessToken,
      buffer: p.buffer,
      mimeType: p.mimeType,
      filenameBase: p.filenameBase,
    });
    if (!up.ok) return up;
    ids.push(up.photoId);
  }

  const form = new FormData();
  form.append("access_token", args.pageAccessToken);
  if (args.message.trim()) {
    form.append("message", args.message.trim());
  }
  ids.forEach((id, i) => {
    form.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
  });

  const res = await fetch(`${BASE}/${args.pageId}/feed`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const data = (await res.json()) as GraphErr & { id?: string };
  if (!res.ok || !data.id) {
    return { ok: false, error: readGraphError(data, "Feed post failed.") };
  }
  return { ok: true, postId: data.id };
}

/** Native video to the Page timeline. */
export async function publishPageVideo(args: {
  pageId: string;
  pageAccessToken: string;
  buffer: ArrayBuffer;
  mimeType: string;
  filenameBase: string;
  description: string;
}): Promise<{ ok: true; videoId?: string } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("access_token", args.pageAccessToken);
  if (args.description.trim()) {
    form.append("description", args.description.trim());
  }
  const ext = extForMime(args.mimeType);
  const safeName = args.filenameBase.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "video";
  form.append(
    "source",
    new Blob([args.buffer], { type: args.mimeType }),
    `${safeName}.${ext}`,
  );

  const res = await fetch(`${BASE}/${args.pageId}/videos`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const data = (await res.json()) as GraphErr & { id?: string };
  if (!res.ok) {
    return { ok: false, error: readGraphError(data, "Video publish failed.") };
  }
  return { ok: true, videoId: data.id };
}
