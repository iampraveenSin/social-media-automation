export type InlineSpinnerTone =
  | "indigo"
  | "onDark"
  | "red"
  | "facebook"
  | "slate";

const toneClasses: Record<InlineSpinnerTone, string> = {
  indigo: "border-indigo-300 border-t-indigo-800",
  onDark: "border-white/40 border-t-white",
  red: "border-red-300 border-t-red-800",
  facebook: "border-white/45 border-t-white",
  slate: "border-slate-300 border-t-slate-700",
};

/** Same visual pattern as the Drive “Random pick” button spinner. */
export function InlineSpinner({
  tone = "indigo",
  className = "",
}: {
  tone?: InlineSpinnerTone;
  className?: string;
}) {
  return (
    <span
      className={`size-4 shrink-0 rounded-full border-2 animate-spin ${toneClasses[tone]} ${className}`}
      aria-hidden
    />
  );
}
