// POST /api/planner/calendar-sync: the iPhone Shortcut pushes the next few weeks of Apple Calendar events here.
// Dependencies are injected so every rule below can be tested without a network or database.
//
// Threat model, in short:
//   - Auth is a per-user random token, stored only as a SHA-256 hash and looked up by that hash.
//     It is checked before the body is read, and every auth failure gets the same 401.
//   - The endpoint is write-only for one kind of data: it replaces the user's imported ("apple") events inside the
//     window it is given. It cannot touch manual events, tasks, blocks, or anything outside that window,
//     and it returns counts only, never calendar data.
//   - Input is size-limited and validated; a minimum gap between syncs limits what a leaked token can do.
//   - Nothing sensitive (token, titles) is ever logged.
import { parseBearer } from "../capture-auth";
import { buildRows, hashToken, syncPayloadSchema, type SyncRow } from "../calendar-sync";

export const MAX_SYNC_BODY_BYTES = 512 * 1024;
export const MIN_SYNC_GAP_MS = 5_000;

export type SyncDeps = {
  /** The active calendar_sync integration whose token hash matches, if any. */
  findIntegration: (tokenHash: string) => Promise<{ id: string; userId: string; lastUsedAt: string | null } | null>;
  /** Replace imported events inside the window. Returns how many rows were written and deleted. */
  apply: (userId: string, rows: SyncRow[], window: { start: string; end: string }) => Promise<{ upserted: number; deleted: number }>;
  touch: (integrationId: string, atIso: string) => Promise<void>;
  now: () => Date;
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });

export async function handleCalendarSync(request: Request, deps: SyncDeps): Promise<Response> {
  const unauthorized = () => json(401, { error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });

  // Authenticate before reading anything from the body.
  const token = parseBearer(request.headers.get("authorization"));
  if (!token) return unauthorized();
  let integration: Awaited<ReturnType<SyncDeps["findIntegration"]>>;
  try {
    integration = await deps.findIntegration(hashToken(token));
  } catch {
    console.error("calendar sync: lookup failed");
    return json(500, { error: "server_error" });
  }
  if (!integration) return unauthorized();

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(415, { error: "unsupported_media_type" });
  }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_SYNC_BODY_BYTES) return json(413, { error: "too_large" });

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, { error: "invalid_input" });
  }
  if (new TextEncoder().encode(raw).length > MAX_SYNC_BODY_BYTES) return json(413, { error: "too_large" });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_input" });
  }
  const parsed = syncPayloadSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: "invalid_input" });

  const now = deps.now();
  if (integration.lastUsedAt && now.getTime() - new Date(integration.lastUsedAt).getTime() < MIN_SYNC_GAP_MS) {
    return json(429, { error: "rate_limited" }, { "Retry-After": "5" });
  }

  try {
    // Claim the slot first so two quick requests cannot both pass the gap check for long.
    await deps.touch(integration.id, now.toISOString());
    const { rows, skipped } = buildRows(parsed.data);
    const result = await deps.apply(
      integration.userId, rows,
      { start: new Date(parsed.data.windowStart).toISOString(), end: new Date(parsed.data.windowEnd).toISOString() },
    );
    return json(200, { ok: true, upserted: result.upserted, deleted: result.deleted, skipped });
  } catch (e) {
    console.error("calendar sync failed:", e instanceof Error ? e.name : "unknown error");
    return json(500, { error: "server_error" });
  }
}
