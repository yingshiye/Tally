import type { LayoutKind } from "./types";

// A library block's `layout_kind` decides its structure (entry / education /
// skills). Its `type_label` is the free-text name users group and filter by
// ("Work experience", "Project", "Clinical rotation", …). Labels that match a
// preset below also pick up friendlier field names and a default section
// title; any other label works with the generic labels. Presets live in code,
// not the database, so adding one never needs a migration.

export const TYPE_LABEL_MAX = 40;

export type EntryFieldLabels = {
  title: string;
  titlePlaceholder: string;
  organization: string;
  organizationPlaceholder: string;
};

export type BlockTypePreset = {
  label: string;
  layoutKind: LayoutKind;
  sectionTitle: string;
  /** Only meaningful for the entry layout. */
  fields?: EntryFieldLabels;
};

export const DEFAULT_ENTRY_FIELD_LABELS: EntryFieldLabels = {
  title: "Title / Role",
  titlePlaceholder: "Software Engineer Intern",
  organization: "Organization",
  organizationPlaceholder: "Google",
};

export const DEFAULT_TYPE_LABELS: Record<LayoutKind, string> = {
  entry: "Work experience",
  education: "Education",
  skills: "Skills",
};

const DEFAULT_SECTION_TITLES: Record<LayoutKind, string> = {
  entry: "Experience",
  education: "Education",
  skills: "Skills",
};

export const BLOCK_TYPE_PRESETS: BlockTypePreset[] = [
  {
    label: "Work experience",
    layoutKind: "entry",
    sectionTitle: "Experience",
    fields: {
      title: "Job title / Role",
      titlePlaceholder: "Software Engineer Intern",
      organization: "Company",
      organizationPlaceholder: "Google",
    },
  },
  {
    label: "Project",
    layoutKind: "entry",
    sectionTitle: "Projects",
    fields: {
      title: "Project name",
      titlePlaceholder: "Internship tracker",
      organization: "Link or tech stack",
      organizationPlaceholder: "Next.js, Supabase",
    },
  },
  {
    label: "Leadership",
    layoutKind: "entry",
    sectionTitle: "Leadership",
    fields: {
      title: "Role",
      titlePlaceholder: "President",
      organization: "Organization",
      organizationPlaceholder: "Women in Computing",
    },
  },
  {
    label: "Volunteer",
    layoutKind: "entry",
    sectionTitle: "Volunteering",
    fields: {
      title: "Role",
      titlePlaceholder: "Volunteer tutor",
      organization: "Organization",
      organizationPlaceholder: "Local food bank",
    },
  },
  {
    label: "Research",
    layoutKind: "entry",
    sectionTitle: "Research",
    fields: {
      title: "Position or project",
      titlePlaceholder: "Undergraduate researcher",
      organization: "Lab or institution",
      organizationPlaceholder: "Vision and Learning Lab",
    },
  },
  {
    label: "Teaching",
    layoutKind: "entry",
    sectionTitle: "Teaching",
    fields: {
      title: "Course or role",
      titlePlaceholder: "Teaching assistant, Intro to Biology",
      organization: "School",
      organizationPlaceholder: "Riverside High School",
    },
  },
  {
    label: "Clinical rotation",
    layoutKind: "entry",
    sectionTitle: "Clinical experience",
    fields: {
      title: "Role",
      titlePlaceholder: "Student nurse",
      organization: "Hospital or clinic",
      organizationPlaceholder: "St. Mary's Hospital",
    },
  },
  { label: "Education", layoutKind: "education", sectionTitle: "Education" },
  { label: "Skills", layoutKind: "skills", sectionTitle: "Skills" },
];

/** Trim and collapse inner whitespace; null when nothing is left. */
export function normalizeTypeLabel(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const collapsed = input.replace(/\s+/g, " ").trim();
  return collapsed === "" ? null : collapsed;
}

function sameLabel(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

export function findPreset(
  label: string | null | undefined,
  layoutKind?: LayoutKind,
): BlockTypePreset | undefined {
  const normalized = normalizeTypeLabel(label);
  if (!normalized) return undefined;
  return BLOCK_TYPE_PRESETS.find(
    (preset) =>
      sameLabel(preset.label, normalized) && (layoutKind === undefined || preset.layoutKind === layoutKind),
  );
}

/** The label to show for a block; blocks created before labels existed fall back to their layout's name. */
export function blockTypeLabel(block: { type_label: string | null; layout_kind: LayoutKind }): string {
  return normalizeTypeLabel(block.type_label) ?? DEFAULT_TYPE_LABELS[block.layout_kind];
}

export function entryFieldLabels(typeLabel: string | null | undefined): EntryFieldLabels {
  return findPreset(typeLabel, "entry")?.fields ?? DEFAULT_ENTRY_FIELD_LABELS;
}

export function sectionTitleFor(layoutKind: LayoutKind, typeLabel: string | null | undefined): string {
  return findPreset(typeLabel, layoutKind)?.sectionTitle ?? DEFAULT_SECTION_TITLES[layoutKind];
}

/** True when `title` is a title this module would generate, so it is safe to overwrite on a type change. */
export function isAutoSectionTitle(title: string): boolean {
  return (
    !title ||
    Object.values(DEFAULT_SECTION_TITLES).includes(title) ||
    BLOCK_TYPE_PRESETS.some((preset) => preset.sectionTitle === title)
  );
}

export type TypeCount = { label: string; count: number };

/** Distinct labels (case-insensitive, first spelling wins), most used first, then alphabetical. */
export function countTypes(blocks: { type_label: string | null; layout_kind: LayoutKind }[]): TypeCount[] {
  const counts = new Map<string, TypeCount>();
  for (const block of blocks) {
    const label = blockTypeLabel(block);
    const key = label.toLocaleLowerCase();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { label, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export type TypeOptions = {
  /** Types the user already has on blocks of this layout. */
  yours: TypeCount[];
  /** Presets for this layout the user has not used yet. */
  presets: BlockTypePreset[];
  /** A brand-new label to offer, or null when the query is empty or already exists. */
  create: string | null;
};

export function buildTypeOptions({
  layoutKind,
  query,
  blocks,
  hidden = [],
}: {
  layoutKind: LayoutKind;
  query: string;
  blocks: { type_label: string | null; layout_kind: LayoutKind }[];
  /** Preset labels the user hid from suggestions. Types already on a block still show under `yours`. */
  hidden?: string[];
}): TypeOptions {
  const normalizedQuery = normalizeTypeLabel(query);
  const needle = (normalizedQuery ?? "").toLocaleLowerCase();
  const matches = (label: string) => label.toLocaleLowerCase().includes(needle);

  const ownBlocks = blocks.filter((block) => block.layout_kind === layoutKind);
  const allYours = countTypes(ownBlocks);
  const yours = allYours.filter((type) => matches(type.label));
  const presets = BLOCK_TYPE_PRESETS.filter(
    (preset) =>
      preset.layoutKind === layoutKind &&
      matches(preset.label) &&
      !hidden.some((label) => sameLabel(label, preset.label)) &&
      !allYours.some((type) => sameLabel(type.label, preset.label)),
  );
  const exists =
    normalizedQuery === null ||
    allYours.some((type) => sameLabel(type.label, normalizedQuery)) ||
    BLOCK_TYPE_PRESETS.some((preset) => preset.layoutKind === layoutKind && sameLabel(preset.label, normalizedQuery));

  return { yours, presets, create: exists ? null : normalizedQuery };
}
