// Authentication helpers for the external capture endpoint. Pure and server-only.
import { createHash, timingSafeEqual } from "node:crypto";

/** Tokens shorter than this are refused outright: 32 characters of random base64 is ~190 bits. */
export const MIN_TOKEN_LENGTH = 32;

export function isUsableToken(token: string | undefined): token is string {
  return typeof token === "string" && token.length >= MIN_TOKEN_LENGTH && token.trim() === token;
}

/** Extract the token from "Authorization: Bearer <token>". Returns null for anything else. */
export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer ([^\s]+)$/.exec(header);
  return match ? match[1] : null;
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * Constant-time token check. Both sides are hashed first so the comparison always runs over
 * equal-length buffers and its timing reveals nothing about the expected token or its length.
 */
export function verifyToken(provided: string | null, expected: string): boolean {
  if (provided === null) return false;
  return timingSafeEqual(digest(provided), digest(expected));
}

export type CaptureLimits = { perMinute: number; perDay: number };
export const DEFAULT_CAPTURE_LIMITS: CaptureLimits = { perMinute: 20, perDay: 300 };

/** Decide from recent insert counts whether another capture is allowed. */
export function checkCaptureLimit(
  recent: { lastMinute: number; lastDay: number },
  limits: CaptureLimits = DEFAULT_CAPTURE_LIMITS,
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (recent.lastMinute >= limits.perMinute) return { ok: false, retryAfterSec: 60 };
  if (recent.lastDay >= limits.perDay) return { ok: false, retryAfterSec: 3600 };
  return { ok: true };
}
