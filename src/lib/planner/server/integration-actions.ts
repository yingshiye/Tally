"use server";
// Create and revoke the Apple Calendar sync token. The plain token is returned once and never stored.
import { revalidatePath } from "next/cache";
import { generateSyncToken } from "../calendar-sync";
import { emptyInputSchema, type ActionResult } from "../schemas";
import { dbFail, ok, withAction } from "./context";

const refresh = () => revalidatePath("/settings/calendar");

/** Revokes any active token and creates a new one. Returns the plain token for display, once. */
export async function createCalendarSyncToken(): Promise<ActionResult<{ token: string }>> {
  return withAction(emptyInputSchema, {}, async (ctx) => {
    const now = ctx.now.toISOString();
    const { error: revokeError } = await ctx.supabase.from("planner_integrations")
      .update({ revoked_at: now }).eq("user_id", ctx.userId).eq("kind", "calendar_sync").is("revoked_at", null);
    if (revokeError) return dbFail("revoke old sync token", revokeError);
    const { token, hash } = generateSyncToken();
    const { error } = await ctx.supabase.from("planner_integrations")
      .insert({ user_id: ctx.userId, kind: "calendar_sync", token_hash: hash });
    if (error) return dbFail("create sync token", error);
    refresh();
    return ok({ token });
  });
}

export async function revokeCalendarSync(): Promise<ActionResult> {
  return withAction(emptyInputSchema, {}, async (ctx) => {
    const { error } = await ctx.supabase.from("planner_integrations")
      .update({ revoked_at: ctx.now.toISOString() }).eq("user_id", ctx.userId).eq("kind", "calendar_sync").is("revoked_at", null);
    if (error) return dbFail("revoke sync token", error);
    refresh();
    return ok(null);
  });
}
