/**
 * The Tally mark: four tally strokes with a slash through them. Strokes use
 * currentColor so it sits on any tile; the slash keeps the accent blue.
 */
export function TallyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path stroke="currentColor" d="M9 9v22M16 9v22M23 9v22M30 9v22" />
      <path stroke="#5b9bf0" d="M5 28L34 12" />
    </svg>
  );
}
