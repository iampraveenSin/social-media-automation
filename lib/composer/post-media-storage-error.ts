/** Maps storage errors to user-facing copy (no internal paths or env details). */
export function postMediaUploadErrorMessage(error: {
  message: string;
  statusCode?: string | number;
}): string {
  const msg = (error.message ?? "").toLowerCase();
  const code = String(error.statusCode ?? "");
  if (
    msg.includes("bucket not found") ||
    msg.includes("does not exist") ||
    (msg.includes("not found") &&
      (msg.includes("bucket") || msg.includes("object"))) ||
    code === "404"
  ) {
    return (
      "File storage is not set up for this app yet. Please contact the person " +
      "who manages Prnit for your team, or try again later."
    );
  }
  if (
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    code === "403"
  ) {
    return (
      "Upload was blocked. Make sure you are signed in. If this keeps happening, " +
      "contact support."
    );
  }
  return error.message || "Upload failed. Please try again.";
}
