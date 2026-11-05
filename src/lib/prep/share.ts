import {
  NEETCODE_150,
  NEETCODE_TOTAL,
  type NeetCodeDifficulty,
} from "./neetcode150";

export type ShareStats = {
  solved: number;
  total: number;
  byDifficulty: Record<NeetCodeDifficulty, { solved: number; total: number }>;
};

export function computeShareStats(completedIds: readonly string[]): ShareStats {
  const completed = new Set(completedIds);
  const byDifficulty: ShareStats["byDifficulty"] = {
    Easy: { solved: 0, total: 0 },
    Medium: { solved: 0, total: 0 },
    Hard: { solved: 0, total: 0 },
  };
  let solved = 0;
  for (const category of NEETCODE_150) {
    for (const problem of category.problems) {
      byDifficulty[problem.difficulty].total += 1;
      if (completed.has(problem.id)) {
        byDifficulty[problem.difficulty].solved += 1;
        solved += 1;
      }
    }
  }
  return { solved, total: NEETCODE_TOTAL, byDifficulty };
}

export function shareInitials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NC";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
