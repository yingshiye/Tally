import { redirect } from "next/navigation";
import { NeetCode150Tracker } from "@/components/features/NeetCode150Tracker";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function PrepPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: progress } = await supabase
    .from("study_task_progress")
    .select("task_id,status,notes")
    .eq("user_id", user.id);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Interview prep</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">NeetCode 150</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Track your progress through the NeetCode 150 by pattern. Check off problems as you solve them,
          flag the ones to revisit, and open any problem on LeetCode from here.
        </p>
      </div>

      <NeetCode150Tracker userId={user.id} initialProgress={progress ?? []} />
    </div>
  );
}
