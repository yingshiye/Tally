// Daily goals as data. Pure: no clock, no database. Applications is built in (its count comes from the
// applications table); every other goal is a manual counter the user can add, rename, retarget or delete.

import { brand } from "../brand";

export const APPLICATIONS_KEY = "applications";
export const MAX_GOALS = 8;
export const MAX_GOAL_LABEL = 30;
export const MAX_GOAL_TARGET = 100;

export type GoalDef = { key: string; label: string; target: number };
/** What the settings form submits. A goal without a key is new. */
export type GoalDraft = { key?: string; label: string; target: number };

export type GoalPlan = {
  inserts: { key: string; label: string; target: number; sort: number }[];
  updates: { key: string; label: string; target: number; sort: number }[];
  archives: string[];
};

/** The three goals every user starts with, from the legacy preference columns. */
export function defaultGoals(p: { goal_applications: number; goal_connections: number; goal_followups: number }): GoalDef[] {
  return [
    { key: APPLICATIONS_KEY, label: brand.goals.applications, target: p.goal_applications },
    { key: "connections", label: brand.goals.connections, target: p.goal_connections },
    { key: "followups", label: brand.goals.followups, target: p.goal_followups },
  ];
}

/** A stable key for a new goal. `random` is injected so this stays pure and testable. */
export function newGoalKey(label: string, taken: Set<string>, random: () => string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "goal";
  let key = slug;
  while (taken.has(key)) key = `${slug}_${random()}`.slice(0, 40);
  return key;
}

/** Returns a message for the first problem, or null when the list is acceptable. */
export function validateGoalDrafts(drafts: GoalDraft[], existingKeys: Set<string>): string | null {
  if (drafts.length > MAX_GOALS) return `You can have up to ${MAX_GOALS} goals`;
  const seen = new Set<string>();
  let hasApplications = false;
  for (const d of drafts) {
    const label = d.label.trim();
    if (!label) return "Give every goal a name";
    if (label.length > MAX_GOAL_LABEL) return `Names can be up to ${MAX_GOAL_LABEL} characters`;
    if (!Number.isInteger(d.target) || d.target < 0 || d.target > MAX_GOAL_TARGET) return `Targets are whole numbers from 0 to ${MAX_GOAL_TARGET}`;
    const norm = label.toLowerCase();
    if (seen.has(norm)) return `You already have a goal called ${label}`;
    seen.add(norm);
    if (d.key !== undefined) {
      if (!existingKeys.has(d.key)) return "That goal no longer exists. Reload and try again";
      if (d.key === APPLICATIONS_KEY) hasApplications = true;
    }
  }
  if (existingKeys.has(APPLICATIONS_KEY) && !hasApplications) return "Applications can't be removed";
  return null;
}

/**
 * Turn the submitted list into writes. Order in the list becomes `sort`. Goals missing from the list are
 * archived (kept, hidden), so their past counts survive. Applications keeps its name.
 */
export function planGoalSave(existing: GoalDef[], drafts: GoalDraft[], random: () => string): GoalPlan {
  const byKey = new Map(existing.map((g) => [g.key, g]));
  const taken = new Set(existing.map((g) => g.key));
  const plan: GoalPlan = { inserts: [], updates: [], archives: [] };
  const kept = new Set<string>();
  drafts.forEach((d, sort) => {
    const label = d.label.trim();
    if (d.key !== undefined) {
      kept.add(d.key);
      plan.updates.push({ key: d.key, label: d.key === APPLICATIONS_KEY ? byKey.get(d.key)!.label : label, target: d.target, sort });
    } else {
      const key = newGoalKey(label, taken, random);
      taken.add(key);
      plan.inserts.push({ key, label, target: d.target, sort });
    }
  });
  plan.archives = existing.filter((g) => !kept.has(g.key)).map((g) => g.key);
  return plan;
}
