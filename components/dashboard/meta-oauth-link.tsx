"use client";

import type { ReactNode } from "react";
import { OauthNavigationButton } from "@/components/ui/oauth-navigation-button";

export function MetaOauthLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <OauthNavigationButton
      href="/api/meta/connect"
      pendingLabel="Redirecting…"
      spinnerTone="facebook"
      className={className}
    >
      {children}
    </OauthNavigationButton>
  );
}
