export function PlaceholderPanel({
  title,
  children,
  /** When false, hides the “coming later” footer (use for sections that are already live). */
  showComingSoonNote = true,
}: {
  title: string;
  children: React.ReactNode;
  showComingSoonNote?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 text-sm leading-relaxed text-slate-600">{children}</div>
      {showComingSoonNote ? (
        <p className="mt-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-3 text-xs font-medium text-indigo-900/80">
          Coming in a later step — UI shell only for now.
        </p>
      ) : null}
    </div>
  );
}
