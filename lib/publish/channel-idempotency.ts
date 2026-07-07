export type PublishChannel = "facebook" | "instagram" | "both";
export type PublishChannelKey = "facebook_page" | "instagram";
export type PublishResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

type StatusResult = { published: boolean; status?: string | null };
type PublishPlatform = "facebook" | "instagram";

type PublishWithChannelIdempotencyArgs<TPayload> = {
  channel: PublishChannel;
  userId: string;
  referenceId: string;
  payload: TPayload;
  getChannelPublishStatus: (
    userId: string,
    referenceId: string,
    channel: PublishChannelKey,
  ) => Promise<StatusResult>;
  publishFacebook: (payload: TPayload) => Promise<PublishResult>;
  publishInstagram: (payload: TPayload) => Promise<PublishResult>;
  logPrefix: string;
  attempts?: number;
  retryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

type PlatformResult = {
  platform: PublishPlatform;
  result: PublishResult;
  duration: number;
};

async function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function publishWithChannelIdempotency<TPayload>({
  channel,
  userId,
  referenceId,
  payload,
  getChannelPublishStatus,
  publishFacebook,
  publishInstagram,
  logPrefix,
  attempts = 3,
  retryDelayMs = 2500,
  sleep = defaultSleep,
  now = Date.now,
}: PublishWithChannelIdempotencyArgs<TPayload>): Promise<{
  facebookResult: PublishResult | null;
  instagramResult: PublishResult | null;
}> {
  const fbStatus =
    channel === "instagram"
      ? { published: false }
      : await getChannelPublishStatus(userId, referenceId, "facebook_page");
  const igStatus =
    channel === "facebook"
      ? { published: false }
      : await getChannelPublishStatus(userId, referenceId, "instagram");

  const shouldPublishFb = channel !== "instagram" && !fbStatus.published;
  const shouldPublishIg = channel !== "facebook" && !igStatus.published;

  console.log(
    `${logPrefix} Channel: ${channel}, FB: ${
      shouldPublishFb ? "publishing" : "skip (already published)"
    }, IG: ${shouldPublishIg ? "publishing" : "skip (already published)"}`,
  );

  const runPlatform = async (
    platform: PublishPlatform,
  ): Promise<PublishResult> => {
    try {
      return platform === "facebook"
        ? await publishFacebook(payload)
        : await publishInstagram(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish threw.";
      return { ok: false, error: msg };
    }
  };

  const retryPlatform = async (
    platform: PublishPlatform,
  ): Promise<PublishResult> => {
    let lastResult: PublishResult | null = null;
    for (let i = 0; i < attempts; i++) {
      const start = now();
      const result = await runPlatform(platform);
      lastResult = result;
      const duration = now() - start;
      const label = platform === "facebook" ? "Facebook" : "Instagram";
      console.log(
        `${logPrefix} ${label} retry ${i + 1}: ${
          result.ok ? "SUCCESS" : "FAILED"
        } (${duration}ms)${result.ok ? "" : ` - ${result.error}`}`,
      );
      if (result.ok) return result;
      if (i < attempts - 1) await sleep(retryDelayMs);
    }
    return lastResult ?? { ok: false, error: "Publish failed." };
  };

  if (channel === "facebook") {
    return {
      facebookResult: shouldPublishFb
        ? await retryPlatform("facebook")
        : { ok: true, message: "Already published" },
      instagramResult: null,
    };
  }

  if (channel === "instagram") {
    return {
      facebookResult: null,
      instagramResult: shouldPublishIg
        ? await retryPlatform("instagram")
        : { ok: true, message: "Already published" },
    };
  }

  const publishPromises: Promise<PlatformResult>[] = [];
  const fbStart = shouldPublishFb ? now() : 0;
  const igStart = shouldPublishIg ? now() : 0;

  if (shouldPublishFb) {
    publishPromises.push(
      runPlatform("facebook").then((result) => ({
        platform: "facebook",
        result,
        duration: now() - fbStart,
      })),
    );
  }

  if (shouldPublishIg) {
    publishPromises.push(
      runPlatform("instagram").then((result) => ({
        platform: "instagram",
        result,
        duration: now() - igStart,
      })),
    );
  }

  const settledResults = await Promise.allSettled(publishPromises);

  for (const settled of settledResults) {
    if (settled.status === "fulfilled") {
      const { platform, result, duration } = settled.value;
      console.log(
        `${logPrefix} ${platform}: ${result.ok ? "SUCCESS" : "FAILED"} (${duration}ms)${
          result.ok ? "" : ` - ${result.error}`
        }`,
      );
    } else {
      console.error(`${logPrefix} Platform promise rejected:`, settled.reason);
    }
  }

  const fbResult = settledResults.find(
    (r) => r.status === "fulfilled" && r.value.platform === "facebook",
  );
  const igResult = settledResults.find(
    (r) => r.status === "fulfilled" && r.value.platform === "instagram",
  );

  let facebookResult: PublishResult | null = null;
  let instagramResult: PublishResult | null = null;

  if (
    shouldPublishFb &&
    (!fbResult || (fbResult.status === "fulfilled" && !fbResult.value.result.ok))
  ) {
    facebookResult = await retryPlatform("facebook");
  } else if (fbResult && fbResult.status === "fulfilled") {
    facebookResult = fbResult.value.result;
  } else if (!shouldPublishFb) {
    facebookResult = { ok: true, message: "Already published" };
  }

  if (
    shouldPublishIg &&
    (!igResult || (igResult.status === "fulfilled" && !igResult.value.result.ok))
  ) {
    instagramResult = await retryPlatform("instagram");
  } else if (igResult && igResult.status === "fulfilled") {
    instagramResult = igResult.value.result;
  } else if (!shouldPublishIg) {
    instagramResult = { ok: true, message: "Already published" };
  }

  return { facebookResult, instagramResult };
}
