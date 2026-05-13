"use client";

import { useState, type ReactNode } from "react";
import { InlineSpinner, type InlineSpinnerTone } from "@/components/ui/inline-spinner";

type Props = {
  href: string;
  className: string;
  children: ReactNode;
  pendingLabel: string;
  spinnerTone: InlineSpinnerTone;
};

/** Full navigation to OAuth URL; shows loading until the browser leaves the page. */
export function OauthNavigationButton({
  href,
  className,
  children,
  pendingLabel,
  spinnerTone,
}: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        window.location.href = href;
      }}
      className={`inline-flex items-center justify-center gap-2 ${className} ${busy ? "pointer-events-none opacity-80" : ""}`}
    >
      {busy ? (
        <>
          <InlineSpinner tone={spinnerTone} />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
