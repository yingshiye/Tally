// POST /api/planner/capture: lets an Apple Shortcut or Raycast drop text into the inbox.
// All behaviour lives here with injected dependencies so it can be tested without a network or database.
//
// Threat model, in short:
//   - The only way in is a long random bearer token (checked in constant time, before the body is read).
//   - The endpoint is write-only: it returns {ok:true}, never any of your data.
//   - It writes one inbox row for one fixed user and nothing else; the inbox is reviewed by a human.
//   - Input is size-limited and validated; failures never explain themselves; nothing sensitive is logged.
//   - A per-minute and per-day cap (counted in the database) limits what a leaked token can do.
import { z } from "zod";
import { checkCaptureLimit, DEFAULT_CAPTURE_LIMITS, isUsableToken, parseBearer, verifyToken, type CaptureLimits } from "../capture-auth";
import { captureInputSchema } from "../schemas";

export const MAX_BODY_BYTES = 8 * 1024;

export type CaptureDeps = {
  env: { token: string | undefined; userId: string | undefined };
  /** Inbox rows created for this user since the given ISO time. */
  countSince: (userId: string, sinceIso: string) => Promise<number>;
  insert: (userId: string, text: string) => Promise<void>;
  now: () => Date;
  limits?: CaptureLimits;
};

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });

export async function handleCapture(request: Request, deps: CaptureDeps): Promise<Response> {
  const { token, userId } = deps.env;

  // Not configured (or configured weakly): behave as if the endpoint does not exist.
  if (!isUsableToken(token) || !userId || !z.uuid().safeParse(userId).success) {
    return json(404, { error: "not_found" });
  }

  // Authenticate before reading anything from the body. One generic answer for every failure.
  if (!verifyToken(parseBearer(request.headers.get("authorization")), token)) {
    return json(401, { error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });
  }

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return json(415, { error: "unsupported_media_type" });
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json(413, { error: "too_large" });

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json(400, { error: "invalid_input" });
  }
  // content-length can be absent or wrong, so check the real size too.
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, { error: "too_large" });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: "invalid_input" });
  }
  const parsed = captureInputSchema.safeParse(body);
  // NUL characters are not storable in Postgres text; refuse them instead of failing later.
  if (!parsed.success || parsed.data.text.includes("\u0000")) return json(400, { error: "invalid_input" });

  const limits = deps.limits ?? DEFAULT_CAPTURE_LIMITS;
  const now = deps.now();
  try {
    const [lastMinute, lastDay] = await Promise.all([
      deps.countSince(userId, new Date(now.getTime() - 60_000).toISOString()),
      deps.countSince(userId, new Date(now.getTime() - 86_400_000).toISOString()),
    ]);
    const limit = checkCaptureLimit({ lastMinute, lastDay }, limits);
    if (!limit.ok) return json(429, { error: "rate_limited" }, { "Retry-After": String(limit.retryAfterSec) });

    await deps.insert(userId, parsed.data.text);
    return json(201, { ok: true });
  } catch (e) {
    // Log the failure class only: never the token, the text, or the raw database error body.
    console.error("planner capture failed:", e instanceof Error ? e.name : "unknown error");
    return json(500, { error: "server_error" });
  }
}
