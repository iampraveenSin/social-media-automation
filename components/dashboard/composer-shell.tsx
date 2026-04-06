"use client";

import type { ReactNode } from "react";
import { ComposerProvider } from "./composer-context";

export function ComposerShell({ children }: { children: ReactNode }) {
  return <ComposerProvider>{children}</ComposerProvider>;
}
