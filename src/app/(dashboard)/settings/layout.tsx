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
      <h1 className="text-xl font-semibold sm:text-2xl">{brand.modules.settings}</h1>
      <SettingsCards status={status} />
      {children}
    </div>
  );
}
