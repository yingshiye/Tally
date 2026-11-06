import { SYNC_SOURCE } from "@/lib/planner/calendar-sync";
import { handleCalendarSync } from "@/lib/planner/server/calendar-sync-handler";
import { createServiceClient } from "@/lib/supabase/service";

// Apple Calendar import endpoint. All logic and the threat model live in calendar-sync-handler.ts.
// The service-role client is created only inside the injected functions, after the token has been hashed.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHUNK = 50;

export async function POST(request: Request) {
  return handleCalendarSync(request, {
    now: () => new Date(),
    findIntegration: async (tokenHash) => {
      const { data, error } = await createServiceClient()
        .from("planner_integrations").select("id,user_id,last_used_at")
        .eq("token_hash", tokenHash).eq("kind", "calendar_sync").is("revoked_at", null).maybeSingle();
      if (error) throw error;
      return data ? { id: data.id, userId: data.user_id, lastUsedAt: data.last_used_at } : null;
    },
    touch: async (id, atIso) => {
      const { error } = await createServiceClient().from("planner_integrations").update({ last_used_at: atIso }).eq("id", id);
      if (error) throw error;
    },
    apply: async (userId, rows, window) => {
      const db = createServiceClient();
      const { data: existing, error: readError } = await db
        .from("planner_calendar_events").select("id,external_id")
        .eq("user_id", userId).eq("source", SYNC_SOURCE).lt("start_at", window.end).gt("end_at", window.start);
      if (readError) throw readError;

      if (rows.length > 0) {
        const { error } = await db.from("planner_calendar_events")
          .upsert(rows.map((r) => ({ ...r, user_id: userId, source: SYNC_SOURCE })), { onConflict: "user_id,source,external_id" });
        if (error) throw error;
      }

      const keep = new Set(rows.map((r) => r.external_id));
      const stale = (existing ?? []).filter((e) => !e.external_id || !keep.has(e.external_id)).map((e) => e.id);
      for (let i = 0; i < stale.length; i += CHUNK) {
        const { error } = await db.from("planner_calendar_events").delete().eq("user_id", userId).eq("source", SYNC_SOURCE).in("id", stale.slice(i, i + CHUNK));
        if (error) throw error;
      }
      return { upserted: rows.length, deleted: stale.length };
    },
  });
}
