"use client";

import type { Tables } from "@/types/supabase";

type Application = Tables<"applications">;

const STAGES = [
  { status: "applied", label: "Applied", fill: "bg-info" },
  { status: "oa", label: "OA", fill: "bg-primary" },
  { status: "interview", label: "Interview", fill: "bg-warning" },
  { status: "offer", label: "Offer", fill: "bg-success" },
] as const;

export function StatsBar({ applications }: { applications: Application[] }) {
  const total = applications.length;
  const counts = STAGES.map((stage) => ({
    ...stage,
    count: applications.filter((a) => a.status === stage.status).length,
  }));
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const pipelineTotal = counts.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <section
      aria-label="Application overview"
      className="flex flex-col gap-5 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
    >
      <div className="sm:min-w-24">
        <p className="text-3xl font-semibold leading-none tabular-nums tracking-tight">
          {total}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">applications</p>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={counts
            .map((stage) => `${stage.count} ${stage.label}`)
            .join(", ")}
        >
          {counts.map(
            (stage) =>
              stage.count > 0 && (
                <div
                  key={stage.status}
                  className={`${stage.fill} transition-[flex-grow] duration-[400ms]`}
                  style={{ flexGrow: stage.count, flexBasis: 0 }}
                />
              ),
          )}
        </div>
        <dl className="mt-3 grid grid-cols-4 gap-2">
          {counts.map((stage) => (
            <div key={stage.status}>
              <dd
                className={`text-xl font-semibold leading-tight tabular-nums tracking-tight ${
                  stage.count === 0
                    ? "text-muted-foreground"
                    : "text-foreground"
                }`}
              >
                {stage.count}
              </dd>
              <dt className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={`size-2 rounded-full ${stage.fill}`}
                  aria-hidden="true"
                />
                {stage.label}
              </dt>
            </div>
          ))}
        </dl>
        {pipelineTotal === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing in the pipeline yet.
          </p>
        )}
      </div>

      <div className="border-border sm:min-w-20 sm:border-l sm:pl-6">
        <p
          className={`text-xl font-semibold leading-tight tabular-nums tracking-tight ${
            rejected === 0 ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {rejected}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-danger" aria-hidden="true" />
          Rejected
        </p>
      </div>
    </section>
  );
}
