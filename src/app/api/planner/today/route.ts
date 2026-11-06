import { NextResponse, type NextRequest } from "next/server";
import { loadToday } from "@/lib/planner/server/queries";
import { todayQuerySchema } from "@/lib/planner/schemas";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/planner/today?date=YYYY-MM-DD — the one stable JSON shape the UI (and later widgets) read.
export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const query = todayQuerySchema.safeParse({ date: request.nextUrl.searchParams.get("date") ?? undefined });
  if (!query.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    const today = await loadToday(supabase, user.id, new Date(), query.data.date);
    return NextResponse.json(today, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("planner: GET /api/planner/today failed", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
