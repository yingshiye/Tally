"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DPI } from "@/lib/resume/measure";
import { LINE_HEIGHT, SECTION_GAP_PT, BULLET_GAP_PT } from "@/lib/resume/style";
import { formatDateRange } from "@/lib/resume/dates";
import { educationSubtitle, EducationExtraLines } from "./EducationExtras";
import type { ParsedSnapshot, SnapshotEntry } from "@/lib/resume/snapshot";

const PT_TO_PX = DPI / 72;

/**
 * The thing that actually gets printed.
 *
 * Rendered from the *snapshot of the version just created*, never from live
 * editor state — that is what makes "the PDF and the immutable version are the
 * same document" true rather than merely likely.
 *
 * It is portaled to <body> so the print stylesheet can hide every other
 * top-level element with one rule; nesting it inside the editor would leave
 * the app shell as an ancestor that print CSS would have to unwind.
 */
export function PrintDocument({ snapshot }: { snapshot: ParsedSnapshot }) {
  // The host element is created once, in a lazy initializer rather than in an
  // effect: an effect would have to call setState to publish it, which this
  // project's lint rules (correctly) reject as a cascading render. This
  // component only ever mounts after a user action, so the initializer runs on
  // the client and `document` is available.
  const [container] = useState<HTMLElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.id = "resume-print-portal";
    return el;
  });

  useEffect(() => {
    if (!container) return;
    document.body.appendChild(container);
    return () => {
      container.remove();
    };
  }, [container]);

  const style = snapshot.resume.style_settings;

  // The page margin is a style setting, so it has to reach @page, which cannot
  // read React props. A custom property on the root element is the bridge.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--resume-print-margin");
    root.style.setProperty("--resume-print-margin", `${style.margin_in}in`);
    return () => {
      if (previous) root.style.setProperty("--resume-print-margin", previous);
      else root.style.removeProperty("--resume-print-margin");
    };
  }, [style.margin_in]);

  if (!container) return null;

  return createPortal(<ResumeDocumentContent snapshot={snapshot} />, container);
}

/**
 * The single static resume renderer shared by export, page measurement and
 * version history. Keeping these surfaces on one DOM structure prevents the
 * editor simulation from disagreeing with the PDF.
 */
export function ResumeDocumentContent({ snapshot }: { snapshot: ParsedSnapshot }) {
  const style = snapshot.resume.style_settings;

  return (
    <div
      data-measure="content"
      className="resume-print-document"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: style.body_font_size_pt * PT_TO_PX,
        lineHeight: LINE_HEIGHT[style.line_spacing],
        color: "#000",
        background: "#fff",
      }}
    >
      {snapshot.header && (
        <header className="resume-print-header" style={{ textAlign: "center" }}>
          <div style={{ fontSize: style.name_font_size_pt * PT_TO_PX, fontWeight: 700, fontVariant: "small-caps" }}>
            {snapshot.header.full_name ?? ""}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0 6px", marginTop: 2, fontSize: "0.91em" }}>
            {[
              snapshot.header.phone && <span key="phone">{snapshot.header.phone}</span>,
              snapshot.header.email && <a key="email" href={`mailto:${snapshot.header.email}`}>{snapshot.header.email}</a>,
              snapshot.header.location && <span key="location">{snapshot.header.location}</span>,
              // Real anchors, so the PDF keeps clickable links and selectable text.
              snapshot.header.linkedin_url && <PrintLink key="linkedin" href={snapshot.header.linkedin_url} />,
              snapshot.header.github_url && <PrintLink key="github" href={snapshot.header.github_url} />,
              snapshot.header.portfolio_url && <PrintLink key="portfolio" href={snapshot.header.portfolio_url} />,
              ...snapshot.header.custom_links.links.map((link, i) => (
                <PrintLink key={`custom-${i}`} href={link.url} label={link.label} />
              )),
            ]
              .filter(Boolean)
              .map((node, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span aria-hidden="true" style={{ color: "#444" }}>|</span>}
                  {node}
                </span>
              ))}
          </div>
        </header>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: SECTION_GAP_PT[style.section_spacing] * PT_TO_PX,
          marginTop: 8,
        }}
      >
        {snapshot.sections.map((section, si) => (
          <section key={si} className="resume-print-section">
            <h2
              className="resume-print-section-heading"
              style={{
                fontSize: style.heading_font_size_pt * PT_TO_PX,
                fontWeight: 400,
                fontVariant: "small-caps",
                borderBottom: "1px solid #000",
                marginBottom: 4,
              }}
            >
              {section.title}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: "0.15in" }}>
              {section.entries.map((entry, ei) => (
                <PrintEntry
                  key={ei}
                  entry={entry}
                  layout={section.layout_kind}
                  projectHeading={isProjectSection(section.title)}
                  dateFormat={style.date_format}
                  bulletGapPx={BULLET_GAP_PT[style.bullet_spacing] * PT_TO_PX}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function isProjectSection(title: string): boolean {
  return /project/i.test(title);
}

/**
 * Shows the human-readable form of a URL rather than the raw href when no
 * label is given — "github.com/someone" reads better in a printed header than
 * "https://github.com/someone/" and still parses cleanly for an ATS.
 */
function PrintLink({ href, label }: { href: string; label?: string }) {
  let text = label ?? href;
  if (!label) {
    try {
      const u = new URL(href);
      text = `${u.host}${u.pathname === "/" ? "" : u.pathname}`;
    } catch {
      text = href;
    }
  }
  return (
    <a href={href} rel="noreferrer">
      {label ? `${label}: ${text}` : text}
    </a>
  );
}

function PrintEntry({
  entry,
  layout,
  projectHeading,
  dateFormat,
  bulletGapPx,
}: {
  entry: SnapshotEntry;
  layout: "entry" | "education" | "skills";
  projectHeading: boolean;
  dateFormat: Parameters<typeof formatDateRange>[2];
  bulletGapPx: number;
}) {
  if (layout === "skills") {
    return (
      <div className="resume-print-entry" style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.91em" }}>
        {(entry.skills_data?.categories ?? []).map((cat, i) => (
          <div key={i}>
            <span style={{ fontWeight: 700 }}>{cat.label}: </span>
            <span>{cat.items.join(", ")}</span>
          </div>
        ))}
      </div>
    );
  }

  const dates = formatDateRange(entry.start_date, entry.end_date, dateFormat);
  const edu = entry.education_data;

  // Jake's \resumeProjectHeading: "Name | tech stack" on one line, dates right.
  const oneLine = layout === "entry" && projectHeading && !entry.location;

  return (
    <div className="resume-print-entry">
      <div className="resume-print-entry-head">
        {oneLine ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>
              <span style={{ fontWeight: 700 }}>{entry.title ?? ""}</span>
              {entry.organization && (
                <>
                  {" | "}
                  <span style={{ fontStyle: "italic" }}>{entry.organization}</span>
                </>
              )}
            </span>
            {dates && <span>{dates}</span>}
          </div>
        ) : (
        <>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontWeight: 700 }}>{entry.title ?? ""}</span>
          {/* Jake's template: education puts the location on the first row and
              the dates on the italic second row; everything else is the reverse. */}
          {layout === "education" ? entry.location && <span>{entry.location}</span> : dates && <span>{dates}</span>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontStyle: "italic", fontSize: "0.91em" }}>
          <span>{layout === "education" ? educationSubtitle(edu) : (entry.organization ?? "")}</span>
          {layout === "education" ? dates && <span>{dates}</span> : entry.location && <span>{entry.location}</span>}
        </div>
        </>
        )}
      </div>

      {layout === "education" && <EducationExtraLines edu={edu} />}

      {entry.subtitle && <div>{entry.subtitle}</div>}

      {entry.bullets.length > 0 && (
        <ul style={{ fontSize: "0.91em" }}>
          {entry.bullets.map((b, i) => (
            <li key={i} className="resume-print-bullet" style={{ marginBottom: bulletGapPx }}>
              {b.content}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
