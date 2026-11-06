const COMPANY_SUFFIXES = new Set([
  "inc",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
]);

const ROLE_STOPWORDS = new Set([
  "intern",
  "internship",
  "summer",
  "fall",
  "spring",
  "winter",
  "the",
  "and",
  "of",
  "a",
  "for",
]);

const SIMILAR_ROLE_THRESHOLD = 0.8;

export type DuplicateCandidate = {
  id: string;
  company: string;
  role: string;
  status: string;
};

export type DuplicateMatch<T extends DuplicateCandidate = DuplicateCandidate> = {
  application: T;
  /** True when the role is the same or nearly the same, not just the company. */
  similarRole: boolean;
};

function words(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function normalizeCompany(company: string): string {
  const parts = words(company);
  while (parts.length > 1 && COMPANY_SUFFIXES.has(parts[parts.length - 1])) {
    parts.pop();
  }
  return parts.join(" ");
}

function roleTokens(role: string): Set<string> {
  return new Set(
    words(role).filter((w) => !ROLE_STOPWORDS.has(w) && !/^\d+$/.test(w)),
  );
}

/** Jaccard similarity of the meaningful words in two role titles, 0..1. */
export function roleSimilarity(a: string, b: string): number {
  const ta = roleTokens(a);
  const tb = roleTokens(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const union = ta.size + tb.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** Same company after normalizing, or one name is a whole-word prefix of the other. */
export function isSameCompany(a: string, b: string): boolean {
  const na = normalizeCompany(a);
  const nb = normalizeCompany(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  return short.length >= 3 && long.startsWith(`${short} `);
}

/**
 * Existing applications that share the company of a candidate, most similar
 * role first. Same company with a different role is still returned (with
 * `similarRole: false`) so the UI can mention it without blocking.
 */
export function findDuplicates<T extends DuplicateCandidate>(
  existing: T[],
  candidate: { company: string; role: string },
  excludeId?: string,
): DuplicateMatch<T>[] {
  return existing
    .filter((a) => a.id !== excludeId && isSameCompany(a.company, candidate.company))
    .map((application) => {
      const score = roleSimilarity(application.role, candidate.role);
      return { application, score, similarRole: score >= SIMILAR_ROLE_THRESHOLD };
    })
    .sort((x, y) => y.score - x.score)
    .map(({ application, similarRole }) => ({ application, similarRole }));
}
