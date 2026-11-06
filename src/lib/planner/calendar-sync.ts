// Pure logic for importing Apple Calendar events. No clock, no database, no network.
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const SYNC_SOURCE = "apple";
export const MAX_SYNC_EVENTS = 1000;
export const MAX_SYNC_WINDOW_DAYS = 62;
export const SYNC_TOKEN_PREFIX = "dpc_";

const isoWithOffset = z.iso.datetime({ offset: true });

/** What the iPhone Shortcut sends. Events are matched by a hash of their content, so no stable id is needed. */
export const syncPayloadSchema = z.object({
  windowStart: isoWithOffset,
  windowEnd: isoWithOffset,
  events: z.array(z.object({
    title: z.string().max(300).default(""),
    start: isoWithOffset,
    end: isoWithOffset,
    allDay: z.boolean().default(false),
  })).max(MAX_SYNC_EVENTS),
}).refine((p) => new Date(p.windowEnd) > new Date(p.windowStart), { message: "windowEnd must be after windowStart" })
  .refine((p) => new Date(p.windowEnd).getTime() - new Date(p.windowStart).getTime() <= MAX_SYNC_WINDOW_DAYS * 86_400_000, {
    message: "window too long",
  });
export type SyncPayload = z.infer<typeof syncPayloadSchema>;

export type SyncRow = { external_id: string; title: string; start_at: string; end_at: string; all_day: boolean };

/** Stable id for an event, derived from its content. A renamed or moved event becomes a new row. */
export function externalIdFor(e: { title: string; start: string; end: string; allDay: boolean }): string {
  const key = [e.title, new Date(e.start).toISOString(), new Date(e.end).toISOString(), e.allDay ? "1" : "0"].join("\u0000");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

/**
 * Turn a payload into rows to upsert. Drops events that end before they start, that have NUL characters
 * (not storable in Postgres text), or that do not overlap the window; collapses duplicates.
 */
export function buildRows(payload: SyncPayload): { rows: SyncRow[]; skipped: number } {
  const ws = new Date(payload.windowStart).getTime();
  const we = new Date(payload.windowEnd).getTime();
  const byId = new Map<string, SyncRow>();
  let skipped = 0;
  for (const e of payload.events) {
    const s = new Date(e.start).getTime();
    const en = new Date(e.end).getTime();
    if (!(en > s) || e.title.includes("\u0000") || !(s < we && en > ws)) {
      skipped++;
      continue;
    }
    const id = externalIdFor(e);
    byId.set(id, { external_id: id, title: e.title.trim(), start_at: new Date(e.start).toISOString(), end_at: new Date(e.end).toISOString(), all_day: e.allDay });
  }
  return { rows: [...byId.values()], skipped };
}

/** Existing imported rows inside the window that are no longer in the payload must be deleted. */
export function idsToDelete(existing: { id: string; external_id: string | null }[], rows: SyncRow[]): string[] {
  const keep = new Set(rows.map((r) => r.external_id));
  return existing.filter((e) => !e.external_id || !keep.has(e.external_id)).map((e) => e.id);
}

// ─── tokens ──────────────────────────────────────────────────────────────────
/** A new random token (shown to the user once) and the hash that is stored. */
export function generateSyncToken(): { token: string; hash: string } {
  const token = SYNC_TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export { displayTitle } from "./event-title";
