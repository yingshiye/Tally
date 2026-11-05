# Internship Tracker design language

## Product character

A focused personal workspace for managing an internship search. It should feel calm, compact, dependable, and work-oriented. The product is visual-first: state is shown with dots, bars, icons, rings, and relative time rather than paragraphs and labels.

## Foundations

- Neutral ink palette (OKLCH, one hue) with one restrained blue accent (`--accent-h` in `src/app/globals.css`).
- All colors come from design tokens (`bg-success`, `text-warning-text`, `bg-info-bg`, …). No hardcoded hex or Tailwind palette colors in the app.
- Hierarchy comes from typography, spacing, and a small number of dividers.
- 12–14px text for dense controls and supporting information; larger type only for page titles and primary metrics. Numbers use `tabular-nums`.
- Modest radii. Shadows only to clarify overlay depth.
- Light and dark themes with equivalent contrast. Body text ≥ 4.5:1, large text and UI borders ≥ 3:1.
- Motion: `transform`/`opacity` only; 150ms feedback, 250ms state change, 400ms entrance; list stagger capped at ~8 rows; `prefers-reduced-motion` respected (tokens in `globals.css`).

## Status colors

| Status | Token |
| --- | --- |
| applied | info |
| OA | primary |
| interview | warning |
| offer | success |
| rejected | danger |
| wishlist | muted |

Color is a secondary cue; the status text or an `aria-label` always carries the meaning.

## Layout

- Desktop sidebar is collapsible and persistent; mobile sidebar is an overlay.
- Page container: `mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8`, h1 `text-xl sm:text-2xl font-semibold`.
- Dashboard order: heading → stats funnel → applications per week → applications table → upcoming events.

## Visual patterns

- **Stats funnel** (dashboard): total as one large number; a single segmented bar for Applied / OA / Interview / Offer sized by count, with a four-column count legend below. Rejected stands apart on the right because it is not a forward stage.
- **Applications per week**: 8 weekly bars from real `applied_date` values; the current week uses the accent.
- **Status** in tables: four pipeline dots filled up to the current stage, in that status's color, with a short text label beneath. Rejected shows empty dots plus a red dot.
- **Dates**: the Applied column shows the actual date. Next step uses a relative chip (`in 2 days`, warning tone within 7 days) with the event title beneath; no next step is a quiet `—`.
- **Upcoming**: a 14-day strip (today highlighted, a dot on days with events) above a short list with relative-time chips.
- **Watchlist**: initials avatar, hostname instead of the full URL, a `New roles · 3d ago` chip when changed, otherwise a quiet `No changes`.
- **OA prep**: progress ring, Easy/Medium/Hard bars, a review count, and a thin progress bar in every category header.
- **Resume blocks**: type filter chips with counts (no dropdown), an icon tile per type (Entry / Education / Skills), and bullet-count dots.
- **Resume editor**: icon-only toolbar buttons with tooltips and one primary text button (Export PDF); the page-fill meter is green under 85%, amber near full, red when over target.
- Empty, loading (skeleton), and error states exist for every data region.

## Tables

- Fit the available width: `table-fixed` with explicit widths for status, date, and actions; the name column takes the rest. No horizontal scroll at desktop widths.
- Long text wraps instead of widening columns.
- The header is sticky to the viewport; the page scrolls, not a nested box.
- Narrow screens hide secondary columns (Applied, Next step) and surface them as a small meta line under the name. Action icons wrap 2×2.
- Controls must line up across rows: give variable-length content (dot counts, labels) a fixed width.
- One continuous table surface; never a separate card per row.

## Components

- Navigation has one obvious active state and quiet hover states.
- Row actions are contextual and aligned at the right edge.
- Every icon-only button has a hover tooltip with a short description.
- Every control has rest, hover, active, focus-visible, and disabled states.

## Marketing landing page (`src/app/page.tsx`)

The one place frosted glass is allowed: a sticky floating pill header, glass cards and screenshot frames over soft fixed color blobs. Keep glass fills about 60% opaque so text contrast holds. Screenshots shown there use fictional data only.

## Data honesty

Charts and metrics are derived from real data. No fabricated numbers, trends, or notifications. Mockups and marketing screenshots use fictional demo data, never real applications.
