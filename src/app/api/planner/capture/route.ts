import { handleCapture } from "@/lib/planner/server/capture-handler";
import { createServiceClient } from "@/lib/supabase/service";

// External capture endpoint (Apple Shortcuts, Raycast). All logic and the threat model live in
// capture-handler.ts. The service-role client is created lazily, only after the request is authenticated,
// and it can only do the two things below.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleCapture(request, {
    env: { token: process.env.PLANNER_CAPTURE_TOKEN, userId: process.env.PLANNER_CAPTURE_USER_ID },
    now: () => new Date(),
    countSince: async (userId, sinceIso) => {
      const { count, error } = await createServiceClient()
        .from("planner_inbox_items").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", sinceIso);
      if (error) throw error;
      return count ?? 0;
    },
    insert: async (userId, text) => {
      const { error } = await createServiceClient().from("planner_inbox_items").insert({ user_id: userId, raw_text: text });
      if (error) throw error;
    },
  });
}
