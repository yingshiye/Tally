import { redirect } from "next/navigation";
import { SettingsCards, type CardStatus, type SettingsSection } from "@/components/features/settings/SettingsCards";
import { brand } from "@/lib/brand";
import { isUsableToken } from "@/lib/planner/capture-auth";
import { getCalendarSyncStatus, getPreferences } from "@/lib/planner/server/queries";
import { formatWorkRange, zoneCity } from "@/lib/planner/settings";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prefs = await getPreferences(supabase, user.id);
  const sync = await getCalendarSyncStatus(supabase, user.id, new Date());
  const captureOn = isUsableToken(process.env.PLANNER_CAPTURE_TOKEN) && !!process.env.PLANNER_CAPTURE_USER_ID;
  const hasGoogle = (user.identities ?? []).some((i) => i.provider === "google");

  const status: Record<SettingsSection, CardStatus> = {
    planner: { tone: "on", lines: [formatWorkRange(prefs.work_start, prefs.work_end), zoneCity(prefs.timezone)] },
    calendar: sync.connected
      ? { tone: "on", lines: ["Connected", `${sync.upcomingEvents} upcoming`] }
      : { tone: "off", lines: ["Not connected"] },
    capture: { tone: captureOn ? "on" : "off", lines: [captureOn ? "On" : "Off (optional)"] },
    account: { tone: hasGoogle ? "on" : "off", lines: [hasGoogle ? "Google connected" : "Google not connected"] },
  };

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold sm:text-2xl">{brand.modules.settings}</h1>
        {user.email && (
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground" title={`Signed in as ${user.email}`}>
            <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground">
              {user.email.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate">{user.email}</span>
          </div>
        )}
      </div>
      <SettingsCards status={status} />
      {children}
    </div>
  );
}
