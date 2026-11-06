import { notFound, redirect } from "next/navigation";
import { ConnectGoogleButton } from "@/components/features/settings/ConnectGoogleButton";
import { GoalsSettings } from "@/components/features/settings/GoalsSettings";
import { PlannerSettings } from "@/components/features/settings/PlannerSettings";
import { SettingsRow } from "@/components/features/settings/SettingsRow";
import { SignOutButton } from "@/components/features/settings/SignOutRow";
import { isUsableToken } from "@/lib/planner/capture-auth";
import { CalendarSettings } from "@/components/features/settings/CalendarSettings";
import { getCalendarSyncStatus, getGoals, getPreferences } from "@/lib/planner/server/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { brand } from "@/lib/brand";

const sections = ["planner", "calendar", "capture", "account"] as const;

function Panel({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return (
    <section aria-labelledby="panel-title" className="space-y-3">
      <div>
        <h2 id="panel-title" className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(sections as readonly string[]).includes(section)) notFound();

  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (section === "planner") {
    const p = await getPreferences(supabase, user.id);
    const goals = await getGoals(supabase, user.id, p);
    return (
      <div className="space-y-8">
      <Panel title="Planner" intro={`How ${brand.productName} plans your day.`}>
        <PlannerSettings
          zones={Intl.supportedValuesOf("timeZone")}
          initial={{
            timezone: p.timezone,
            workStart: p.work_start.slice(0, 5),
            workEnd: p.work_end.slice(0, 5),
            bufferMin: p.buffer_min,
            starterMin: p.starter_min,
            topN: p.top_n,
          }}
        />
      </Panel>
      <GoalsSettings initial={goals} />
      </div>
    );
  }

  if (section === "calendar") {
    const [p, sync] = await Promise.all([getPreferences(supabase, user.id), getCalendarSyncStatus(supabase, user.id, new Date())]);
    const lastSyncLabel = sync.lastSyncAt
      ? new Intl.DateTimeFormat("en-US", { timeZone: p.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(sync.lastSyncAt))
      : null;
    return (
      <Panel title="Calendar" intro={`Apple Calendar owns your fixed events. ${brand.productName} reads them, and never changes them.`}>
        <CalendarSettings connected={sync.connected} lastSyncLabel={lastSyncLabel} upcomingEvents={sync.upcomingEvents} showTitles={p.show_event_titles} />
      </Panel>
    );
  }

  if (section === "capture") {
    const on = isUsableToken(process.env.PLANNER_CAPTURE_TOKEN) && !!process.env.PLANNER_CAPTURE_USER_ID;
    return (
      <Panel title="Capture" intro="Send text to your inbox from an iPhone shortcut or any tool that can make a web request.">
        <div className="space-y-1 rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium">What it does</p>
          <p className="text-muted-foreground">Capture puts a quick thought into your {brand.productName} inbox in seconds. Inside the app, press Cmd+K; that always works and needs no setup. This page is only for sending thoughts from outside the app, such as an iPhone shortcut. If you won&apos;t do that, you can ignore it.</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4">
          <SettingsRow label="Status">
            <span className="text-sm">{on ? "On" : "Off (optional)"}</span>
          </SettingsRow>
          <SettingsRow label="Endpoint" hint="POST with an Authorization: Bearer header.">
            <code className="rounded bg-muted px-2 py-1 text-xs">/api/planner/capture</code>
          </SettingsRow>
          {!on && (
            <p className="py-3 text-xs text-muted-foreground">
              To turn it on, set PLANNER_CAPTURE_TOKEN and PLANNER_CAPTURE_USER_ID on the server. The token never appears in the app.
            </p>
          )}
        </div>
      </Panel>
    );
  }

  const providers = Array.from(new Set((user.identities ?? []).map((i) => i.provider)));
  const hasGoogle = providers.includes("google");
  return (
    <Panel title="Account" intro="How you sign in.">
      <div className="rounded-lg border border-border bg-card px-4">
        <SettingsRow label="Email">
          <span className="text-sm">{user.email}</span>
        </SettingsRow>
        <SettingsRow label="Google" hint={hasGoogle ? "You can sign in with Google." : "Link Google to sign in with one click."}>
          {hasGoogle ? <span className="text-sm">Connected</span> : <ConnectGoogleButton />}
        </SettingsRow>
        <SettingsRow label="Sign out">
          <SignOutButton />
        </SettingsRow>
      </div>
    </Panel>
  );
}
