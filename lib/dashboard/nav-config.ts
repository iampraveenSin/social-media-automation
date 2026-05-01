export type DashboardNavItem = {
  href: string;
  label: string;
  description: string;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    href: "/dashboard/main",
    label: "Main",
    description: "Connect Meta & Drive, compose posts, schedule, and auto-post.",
  },
  {
    href: "/dashboard/post",
    label: "Post",
    description:
      "Scheduled and published Facebook posts — upcoming queue and history.",
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    description:
      "Sign-in email, connected services, and Facebook / Instagram insights from Meta.",
  },
  {
    href: "/dashboard/business",
    label: "Business",
    description:
      "Facebook Page and linked Instagram summary from Meta (Graph API).",
  },
  {
    href: "/dashboard/auto",
    label: "Auto",
    description:
      "Hands-off posts from Google Drive on a repeating schedule, with optional AI captions.",
  },
];
