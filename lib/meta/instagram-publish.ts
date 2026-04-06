import { META_GRAPH_VERSION } from "@/lib/env/meta";

const BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

type GraphErr = { error?: { message?: string } };

function readErr(data: GraphErr, fallback: string): string {
  return data.error?.message || fallback;
}

async function postForm(
  igUserId: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${BASE}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return (await res.json()) as Record<string, unknown>;
}

async function postPublish(
  igUserId: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${BASE}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  return (await res.json()) as Record<string, unknown>;
}

/** Single feed photo (JPEG/PNG URL must be reachable by Instagram). */
export async function publishInstagramSingleImage(args: {
  igUserId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<{ ok: true; mediaId: string } | { ok: false; error: string }> {
  const cap = args.caption.slice(0, 2200);
  const create = await postForm(args.igUserId, {
    access_token: args.pageAccessToken,
    image_url: args.imageUrl,
    caption: cap,
  });
  const createId = typeof create.id === "string" ? create.id : null;
  if (!createId) {
    return {
      ok: false,
      error: readErr(create as GraphErr, "Instagram media container failed."),
    };
  }

  const pub = await postPublish(args.igUserId, {
    access_token: args.pageAccessToken,
    creation_id: createId,
  });
  const mediaId = typeof pub.id === "string" ? pub.id : null;
  if (!mediaId) {
    return {
      ok: false,
      error: readErr(pub as GraphErr, "Instagram publish failed."),
    };
  }
  return { ok: true, mediaId };
}

/** Carousel: 2–10 images. */
export async function publishInstagramCarousel(args: {
  igUserId: string;
  pageAccessToken: string;
  imageUrls: string[];
  caption: string;
}): Promise<{ ok: true; mediaId: string } | { ok: false; error: string }> {
  const urls = args.imageUrls;
  if (urls.length < 2 || urls.length > 10) {
    return { ok: false, error: "Instagram carousel needs 2–10 images." };
  }

  const childIds: string[] = [];
  for (const imageUrl of urls) {
    const create = await postForm(args.igUserId, {
      access_token: args.pageAccessToken,
      image_url: imageUrl,
      is_carousel_item: "true",
    });
    const id = typeof create.id === "string" ? create.id : null;
    if (!id) {
      return {
        ok: false,
        error: readErr(create as GraphErr, "Instagram carousel item failed."),
      };
    }
    childIds.push(id);
  }

  const cap = args.caption.slice(0, 2200);
  const carousel = await postForm(args.igUserId, {
    access_token: args.pageAccessToken,
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption: cap,
  });
  const carouselId = typeof carousel.id === "string" ? carousel.id : null;
  if (!carouselId) {
    return {
      ok: false,
      error: readErr(carousel as GraphErr, "Instagram carousel container failed."),
    };
  }

  const pub = await postPublish(args.igUserId, {
    access_token: args.pageAccessToken,
    creation_id: carouselId,
  });
  const mediaId = typeof pub.id === "string" ? pub.id : null;
  if (!mediaId) {
    return {
      ok: false,
      error: readErr(pub as GraphErr, "Instagram carousel publish failed."),
    };
  }
  return { ok: true, mediaId };
}
