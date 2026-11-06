// Shared plumbing for planner server code: auth, validation, error mapping, change log.
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";
import type { ActionError, ActionResult } from "../schemas";
import type { PrefsRow } from "../today";
import { getPreferences } from "./queries";

export type Supabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

export type Ctx = {
  supabase: Supabase;
  userId: string;
  /** The only place the clock is read; pure modules receive this value. */
  now: Date;
  prefs: () => Promise<PrefsRow>;
};

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: ActionError, extra?: { message?: string; data?: { postponedCount?: number } }): ActionResult<never> =>
  ({ ok: false, error, ...extra });

/** Log the real database error server-side; the client only sees a generic code. */
export function dbFail(context: string, error: unknown): ActionResult<never> {
  console.error(`planner: ${context}`, error);
  return fail("db_error");
}

export async function getCtx(): Promise<Ctx | null> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let cached: PrefsRow | null = null;
  return {
    supabase,
    userId: user.id,
    now: new Date(),
    prefs: async () => (cached ??= await getPreferences(supabase, user.id)),
  };
}

/** Authenticate, validate input with Zod, then run the handler. */
export async function withAction<S extends z.ZodType, T>(
  schema: S,
  raw: unknown,
  handler: (ctx: Ctx, input: z.output<S>) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const ctx = await getCtx();
  if (!ctx) return fail("unauthenticated");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail("invalid_input", { message: z.prettifyError(parsed.error) });
  try {
    return await handler(ctx, parsed.data);
  } catch (e) {
    return dbFail("unexpected", e);
  }
}

/** Append a row to the append-only planner_changes log. */
export async function logChange(
  ctx: Ctx,
  entry: {
    entityType: "task" | "block" | "calendar_event";
    entityId: string;
    action: "create" | "move" | "resize" | "postpone" | "complete" | "drop" | "pin" | "unpin";
    before?: Json | null;
    after?: Json | null;
    reason?: string | null;
  },
): Promise<boolean> {
  const { error } = await ctx.supabase.from("planner_changes").insert({
    user_id: ctx.userId,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
    reason: entry.reason ?? null,
  });
  if (error) console.error("planner: failed to write planner_changes", error);
  return !error;
}
