import { redirect } from "next/navigation";
import { TodayView } from "@/components/features/planner/TodayView";
import { loadToday } from "@/lib/planner/server/queries";
import { todayQuerySchema } from "@/lib/planner/schemas";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const query = todayQuerySchema.safeParse(await searchParams);
  const [today, projects] = await Promise.all([
    loadToday(supabase, user.id, new Date(), query.success ? query.data.date : undefined),
    supabase.from("planner_projects").select("id,name").eq("user_id", user.id).is("archived_at", null).order("name"),
  ]);

  return <TodayView data={today} projects={projects.data ?? []} />;
}
