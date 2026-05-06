export type AutoPostChannel = "facebook" | "instagram" | "both";

export function isAutoPostChannel(x: unknown): x is AutoPostChannel {
  return x === "facebook" || x === "instagram" || x === "both";
}

export function normalizeAutoPostChannel(x: unknown): AutoPostChannel {
  return isAutoPostChannel(x) ? x : "facebook";
}
