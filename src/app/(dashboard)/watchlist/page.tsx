import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { WatchlistPanel } from "@/components/features/WatchlistPanel";

export default async function WatchlistPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("user_watchlist")
    .select("*")
    .order("has_changes", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Watchlist
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sites you&apos;re monitoring for job openings.
        </p>
      </div>
      <WatchlistPanel items={items ?? []} userId={user.id} />
    </div>
  );
}
