import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PrepProgressCard } from "@/components/features/PrepProgressCard";
import { computeShareStats } from "@/lib/prep/share";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

export const metadata: Metadata = {
  title: "NeetCode 150 progress · Internship Tracker",
  robots: { index: false, follow: false },
};

export default async function PublicPrepPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) notFound();

  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.rpc("get_public_prep_share", {
    p_token: token,
  });
  const share = data?.[0];
  if (!share) notFound();

  const stats = computeShareStats(share.completed_ids);

  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-x-clip bg-background px-4 py-16 text-foreground antialiased">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 top-8 size-[460px] rounded-full bg-blue-400/50 blur-3xl" />
        <div className="absolute -right-24 top-1/3 size-[480px] rounded-full bg-violet-400/40 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 size-[460px] rounded-full bg-teal-300/50 blur-3xl" />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-card/60 p-2 shadow-[0_8px_32px_oklch(0.3_0.05_260/0.10)] backdrop-blur-xl dark:border-white/10">
        <PrepProgressCard
          displayName={share.display_name}
          stats={stats}
          solvedLast7d={share.solved_last_7d}
        />
      </div>

      <Link
        href="/signup"
        className="group mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]"
      >
        Track your own prep
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
      <p className="mt-3 text-xs text-muted-foreground">
        Free internship tracker with a NeetCode 150 checklist.
      </p>
    </main>
  );
}
