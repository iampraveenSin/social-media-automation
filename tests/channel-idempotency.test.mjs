import assert from "node:assert/strict";
import test from "node:test";
import {
  publishWithChannelIdempotency,
} from "../lib/publish/channel-idempotency.ts";

const payload = {
  caption: "hello",
  items: [{ kind: "drive", fileId: "file-1" }],
};

test("retry with same reference skips Facebook after Facebook succeeds and Instagram fails", async () => {
  const published = new Set();
  const attempts = [];
  const referenceId = "scheduled-post-1";

  const getChannelPublishStatus = async (_userId, ref, channel) => ({
    published: published.has(`${ref}:${channel}`),
    status: published.has(`${ref}:${channel}`) ? "published" : null,
  });

  const publishFacebook = async () => {
    attempts.push("facebook");
    published.add(`${referenceId}:facebook_page`);
    return { ok: true, message: "fb ok" };
  };

  const publishInstagram = async () => {
    attempts.push("instagram");
    return { ok: false, error: "ig failed" };
  };

  await publishWithChannelIdempotency({
    channel: "both",
    userId: "user-1",
    referenceId,
    payload,
    getChannelPublishStatus,
    publishFacebook,
    publishInstagram,
    logPrefix: "[test]",
    attempts: 1,
    retryDelayMs: 0,
    sleep: async () => {},
    now: () => 0,
  });

  await publishWithChannelIdempotency({
    channel: "both",
    userId: "user-1",
    referenceId,
    payload,
    getChannelPublishStatus,
    publishFacebook,
    publishInstagram,
    logPrefix: "[test]",
    attempts: 1,
    retryDelayMs: 0,
    sleep: async () => {},
    now: () => 0,
  });

  assert.equal(attempts.filter((x) => x === "facebook").length, 1);
  assert.equal(attempts.filter((x) => x === "instagram").length, 4);
  assert.equal(attempts.at(-1), "instagram");
});

test("second call with same reference does not insert duplicate row for an already-published channel", async () => {
  const rows = [];
  const referenceId = "auto-user-1-2026-07-07T10:00:00.000Z";

  const getChannelPublishStatus = async (_userId, ref, channel) => ({
    published: rows.some(
      (row) =>
        row.referenceId === ref &&
        row.channel === channel &&
        row.status === "published",
    ),
    status: rows.some(
      (row) =>
        row.referenceId === ref &&
        row.channel === channel &&
        row.status === "published",
    )
      ? "published"
      : null,
  });

  const publishFacebook = async () => {
    rows.push({
      referenceId,
      channel: "facebook_page",
      status: "published",
    });
    return { ok: true, message: "fb ok" };
  };

  await publishWithChannelIdempotency({
    channel: "facebook",
    userId: "user-1",
    referenceId,
    payload,
    getChannelPublishStatus,
    publishFacebook,
    publishInstagram: async () => {
      throw new Error("Instagram should not be called");
    },
    logPrefix: "[test]",
    attempts: 1,
    retryDelayMs: 0,
    sleep: async () => {},
    now: () => 0,
  });

  await publishWithChannelIdempotency({
    channel: "facebook",
    userId: "user-1",
    referenceId,
    payload,
    getChannelPublishStatus,
    publishFacebook,
    publishInstagram: async () => {
      throw new Error("Instagram should not be called");
    },
    logPrefix: "[test]",
    attempts: 1,
    retryDelayMs: 0,
    sleep: async () => {},
    now: () => 0,
  });

  assert.equal(
    rows.filter(
      (row) =>
        row.referenceId === referenceId &&
        row.channel === "facebook_page" &&
        row.status === "published",
    ).length,
    1,
  );
});
