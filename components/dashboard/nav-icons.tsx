export function NavIcon({
  name,
  className = "size-5",
}: {
  name: "main" | "post" | "profile" | "business" | "auto";
  className?: string;
}) {
  const stroke = "currentColor";
  const common = { className, fill: "none" as const, stroke, strokeWidth: 1.75 };

  switch (name) {
    case "main":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "post":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 12h8M8 16h5" strokeLinecap="round" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <circle cx="12" cy="9" r="3.5" />
          <path
            d="M5.5 20.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "business":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path d="M4 20V10l8-4 8 4v10" strokeLinejoin="round" />
          <path d="M9 20v-6h6v6" strokeLinejoin="round" />
        </svg>
      );
    case "auto":
      return (
        <svg viewBox="0 0 24 24" {...common} aria-hidden>
          <path
            d="M12 6v6l4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    default:
      return null;
  }
}

export function iconForNavHref(href: string): "main" | "post" | "profile" | "business" | "auto" {
  if (href.includes("/post")) return "post";
  if (href.includes("/profile")) return "profile";
  if (href.includes("/business")) return "business";
  if (href.includes("/auto")) return "auto";
  return "main";
}
