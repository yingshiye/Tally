import { X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { EducationData } from "@/lib/resume/types";

/**
 * Joins degree + field_of_study for entries that still carry both as
 * separate fields, from before the education editor combined them into one
 * "Degree" input.
 */
export function educationSubtitle(edu: Pick<EducationData, "degree" | "field_of_study"> | null | undefined): string {
  return [edu?.degree, edu?.field_of_study].filter(Boolean).join(", ");
}

/**
 * minor/gpa/honors/coursework/details have no editor UI any more (the
 * education editor only writes `degree` now), but existing resumes/library
 * blocks may still carry this data. Shared by every place an education entry
 * is rendered (live editor, version snapshots, print/export) so it can never
 * be visible in one and silently missing in another.
 */
export function EducationExtraLines({
  edu,
  onChange,
}: {
  edu: EducationData | null | undefined;
  /** Editor only: when given, each line gets a remove button (hidden in print). */
  onChange?: (patch: Partial<EducationData>) => void;
}) {
  if (!edu) return null;
  const lines: { key: string; text: string; clear: Partial<EducationData> }[] = [];
  if (edu.minor) lines.push({ key: "minor", text: `Minor: ${edu.minor}`, clear: { minor: "" } });
  if (edu.gpa) lines.push({ key: "gpa", text: `GPA: ${edu.gpa}`, clear: { gpa: "" } });
  if (edu.honors && edu.honors.length > 0) lines.push({ key: "honors", text: `Honors: ${edu.honors.join(", ")}`, clear: { honors: [] } });
  if (edu.coursework && edu.coursework.length > 0) {
    lines.push({ key: "coursework", text: `Relevant coursework: ${edu.coursework.join(", ")}`, clear: { coursework: [] } });
  }
  edu.details?.forEach((d, i) =>
    lines.push({ key: `detail-${i}`, text: d, clear: { details: edu.details!.filter((_, j) => j !== i) } }),
  );
  if (lines.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((line) => (
        <span key={line.key} className="group/extra">
          {line.text}
          {onChange && (
            <Tooltip label="Remove this line">
              <button
                type="button"
                aria-label={`Remove: ${line.text}`}
                onClick={() => onChange(line.clear)}
                className="ml-1.5 inline-flex align-middle text-muted-foreground opacity-0 hover:text-foreground focus:opacity-100 group-hover/extra:opacity-100 print:hidden"
              >
                <X className="h-3 w-3" />
              </button>
            </Tooltip>
          )}
        </span>
      ))}
    </div>
  );
}
