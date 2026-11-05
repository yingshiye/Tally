"use client";

import { Plus, Minus, PencilLine, ArrowUpDown, Equal } from "lucide-react";
import type { ChangeKind, FieldChange, SnapshotDiff } from "@/lib/resume/version-compare";

/**
 * Read-only presentation of a snapshot diff.
 *
 * Every change kind carries an icon and a word as well as a colour, so the
 * comparison is readable without relying on colour perception — "Added" says
 * Added, it is not merely green.
 */

const KIND_META: Record<ChangeKind, { label: string; icon: typeof Plus; className: string }> = {
  added: { label: "Added", icon: Plus, className: "text-success-text" },
  removed: { label: "Removed", icon: Minus, className: "text-danger-text" },
  changed: { label: "Changed", icon: PencilLine, className: "text-warning-text" },
  reordered: { label: "Moved", icon: ArrowUpDown, className: "text-info-text" },
  unchanged: { label: "Unchanged", icon: Equal, className: "text-muted-foreground" },
};

function KindTag({ kind }: { kind: ChangeKind }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${meta.className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  );
}

function FieldChangeRow({ change }: { change: FieldChange }) {
  return (
    <li className="grid grid-cols-[8rem_1fr] gap-2 py-0.5 text-xs sm:grid-cols-[10rem_1fr_1fr]">
      <span className="text-muted-foreground">{change.label}</span>
      <span className="text-danger-text line-through decoration-red-400/60 ">
        {change.before ?? <span className="not-italic text-muted-foreground no-underline">(empty)</span>}
      </span>
      <span className="text-success-text">
        {change.after ?? <span className="text-muted-foreground">(empty)</span>}
      </span>
    </li>
  );
}

export function VersionCompareView({
  diff,
  beforeLabel,
  afterLabel,
}: {
  diff: SnapshotDiff;
  beforeLabel: string;
  afterLabel: string;
}) {
  if (!diff.hasChanges) {
    return (
      <p className="rounded-md bg-success-bg px-3 py-2 text-sm text-success-text">
        No differences between {beforeLabel} and {afterLabel}.
      </p>
    );
  }

  const changedSections = diff.sections.filter((s) => s.kind !== "unchanged");

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-xs text-muted-foreground">
        Comparing <span className="font-medium text-foreground">{beforeLabel}</span> (struck through)
        with <span className="font-medium text-foreground">{afterLabel}</span>.
      </p>

      {diff.headerChanges.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header</h4>
          <ul>
            {diff.headerChanges.map((c) => (
              <FieldChangeRow key={c.field} change={c} />
            ))}
          </ul>
        </section>
      )}

      {diff.metaChanges.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resume settings</h4>
          <ul>
            {diff.metaChanges.map((c) => (
              <FieldChangeRow key={c.field} change={c} />
            ))}
          </ul>
        </section>
      )}

      {diff.styleChanges.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Style</h4>
          <ul>
            {diff.styleChanges.map((c) => (
              <FieldChangeRow key={c.field} change={c} />
            ))}
          </ul>
        </section>
      )}

      {changedSections.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</h4>
          <ul className="flex flex-col gap-2">
            {changedSections.map((section) => (
              <li key={section.key} className="rounded-md border border-border p-2 ">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{section.title}</span>
                  <KindTag kind={section.kind} />
                </div>
                {section.titleChange && (
                  <ul>
                    <FieldChangeRow change={section.titleChange} />
                  </ul>
                )}
                {section.kind === "reordered" && section.fromIndex !== null && section.toIndex !== null && (
                  <p className="text-xs text-muted-foreground">
                    Moved from position {section.fromIndex + 1} to {section.toIndex + 1}.
                  </p>
                )}
                <ul className="mt-1 flex flex-col gap-1.5">
                  {section.entries
                    .filter((e) => e.kind !== "unchanged")
                    .map((entry) => (
                      <li key={entry.key} className="rounded border border-border p-1.5 ">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-foreground">{entry.label}</span>
                          <KindTag kind={entry.kind} />
                        </div>
                        {entry.kind === "reordered" && entry.fromIndex !== null && entry.toIndex !== null && (
                          <p className="text-xs text-muted-foreground">
                            Moved from position {entry.fromIndex + 1} to {entry.toIndex + 1}.
                          </p>
                        )}
                        {entry.fieldChanges.length > 0 && (
                          <ul className="mt-0.5">
                            {entry.fieldChanges.map((c) => (
                              <FieldChangeRow key={c.field} change={c} />
                            ))}
                          </ul>
                        )}
                        {entry.bulletChanges.some((b) => b.kind !== "unchanged") && (
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {entry.bulletChanges
                              .filter((b) => b.kind !== "unchanged")
                              .map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs">
                                  <span className="shrink-0">
                                    <KindTag kind={b.kind} />
                                  </span>
                                  <span className="min-w-0">
                                    {b.kind === "changed" ? (
                                      <>
                                        <span className="text-danger-text line-through ">{b.before}</span>{" "}
                                        <span className="text-success-text">{b.after}</span>
                                      </>
                                    ) : (
                                      <span className="text-foreground">{b.after ?? b.before}</span>
                                    )}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        )}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
