# Taste review checklist

Before considering UI work complete:

## Restraint

- Remove containers that do not improve grouping or comprehension.
- Avoid nested cards and a card-per-row treatment.
- Avoid gradients, glow shadows, glass effects, oversized radii, and decorative charts. The marketing landing page is the only place glass and soft color blobs are allowed (see `DESIGN.md`); never use them inside the app.
- Keep borders quiet and purposeful; prefer one enclosing border to many repeated borders.
- Keep the accent color scarce so active and actionable elements remain clear.
- Limit badges to states that need quick scanning; do not badge ordinary metadata.

## Visual over text

- Prefer a dot, bar, ring, icon, or relative time over a sentence or a label when it says the same thing faster.
- Icons need a tooltip. Use a short text label instead when an icon would be ambiguous (for example the primary action).
- A chart is allowed only when it answers a real question from real data (funnel, weekly pace, progress), not as decoration.

## Honesty

- Do not add fabricated metrics, trends, notifications, avatars, or controls.
- Mockups and screenshots use fictional data only.

## Consistency

- Use consistent spacing increments and align text baselines across rows.
- Controls line up across rows; variable-length content gets a fixed width.
- Check that the shell, metrics, table, dialogs, and empty states feel like one product.
- Make compactness come from structure, not tiny text or reduced hit targets.

## Verify in the browser

- Wide desktop: tables fit without horizontal scroll, headers stay visible, no nested scroll box.
- Narrow (390px): no horizontal page scroll; secondary info still reachable.
- Dark mode: contrast still passes.
- Keyboard: focus-visible on every control; Escape closes overlays.
- Empty, loading, error, and long-text cases render sensibly.
