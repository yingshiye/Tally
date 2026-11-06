"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Inbox, SlidersHorizontal, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type SettingsSection = "planner" | "calendar" | "capture" | "account";

export type CardStatus = {
  /** One or two short lines. Each line starts at the same left edge on every card. */
  lines: string[];
  /** on = working, off = needs setup or not available yet. Shown as a small dot. */
  tone: "on" | "off";
};

const cards: { id: SettingsSection; label: string; icon: typeof Inbox }[] = [
  { id: "planner", label: "Planner", icon: SlidersHorizontal },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "capture", label: "Capture", icon: Inbox },
  { id: "account", label: "Account", icon: UserRound },
];

export function SettingsCards({ status }: { status: Record<SettingsSection, CardStatus> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ id, label, icon: Icon }) => {
        const active = pathname === `/settings/${id}`;
        const s = status[id];
        return (
          <Link
            key={id}
            href={`/settings/${id}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              active ? "border-primary ring-1 ring-primary" : "border-border hover:bg-muted/60",
            )}
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">{label}</span>
            <span className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {s.lines.map((line, i) => (
                <span key={line} className="flex min-w-0 items-center gap-1.5">
                  {i === 0 && (
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 shrink-0 rounded-full", s.tone === "on" ? "bg-success" : "bg-muted-foreground/40")}
                    />
                  )}
                  <span className={cn("truncate", i > 0 && "pl-3")}>{line}</span>
                </span>
              ))}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
