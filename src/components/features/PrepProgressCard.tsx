import { shareInitials, type ShareStats } from "@/lib/prep/share";
import type { NeetCodeDifficulty } from "@/lib/prep/neetcode150";

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

const DIFFICULTIES: { level: NeetCodeDifficulty; fill: string }[] = [
  { level: "Easy", fill: "bg-success" },
  { level: "Medium", fill: "bg-warning" },
  { level: "Hard", fill: "bg-danger" },
];

export function PrepProgressCard({
  displayName,
  stats,
  solvedLast7d,
}: {
  displayName: string | null;
  stats: ShareStats;
  solvedLast7d: number;
}) {
  const fraction = stats.total === 0 ? 0 : stats.solved / stats.total;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
          >
            {shareInitials(displayName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {displayName ? `${displayName}'s OA prep` : "OA prep"}
            </p>
            <p className="text-xs text-muted-foreground">NeetCode 150</p>
          </div>
        </div>
        {solvedLast7d > 0 && (
          <span className="shrink-0 rounded-full bg-success-bg px-2 py-1 text-xs font-medium tabular-nums text-success-text">
            +{solvedLast7d} this week
          </span>
        )}
      </div>

      <div className="mt-6 flex items-center gap-6">
        <svg
          viewBox="0 0 100 100"
          className="size-24 shrink-0 -rotate-90"
          role="img"
          aria-label={`${stats.solved} of ${stats.total} solved`}
        >
          <circle
            cx="50"
            cy="50"
            r={RING_R}
            className="fill-none stroke-muted"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={RING_R}
            className="fill-none stroke-primary"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - fraction)}
          />
        </svg>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none tabular-nums tracking-tight">
            {stats.solved}
            <span className="text-muted-foreground">/{stats.total}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">problems solved</p>
          <dl className="mt-3 space-y-1.5">
            {DIFFICULTIES.map(({ level, fill }) => (
              <div key={level} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${fill}`}
                />
                <dt className="w-14 text-muted-foreground">{level}</dt>
                <dd className="font-medium tabular-nums">
                  {stats.byDifficulty[level].solved}
                  <span className="text-muted-foreground">
                    /{stats.byDifficulty[level].total}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
