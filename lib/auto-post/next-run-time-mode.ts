export type AutoPostNextRunTimeMode = "manual" | "smart";

export function isAutoPostNextRunTimeMode(
  x: unknown,
): x is AutoPostNextRunTimeMode {
  return x === "manual" || x === "smart";
}

export function normalizeAutoPostNextRunTimeMode(
  x: unknown,
): AutoPostNextRunTimeMode {
  return isAutoPostNextRunTimeMode(x) ? x : "manual";
}
