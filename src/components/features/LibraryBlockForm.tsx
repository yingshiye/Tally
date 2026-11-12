"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  DEFAULT_TYPE_LABELS,
  buildTypeOptions,
  findPreset,
  isAutoSectionTitle,
  normalizeTypeLabel,
  sectionTitleFor,
} from "@/lib/resume/block-types";
import type { LayoutKind, LibraryBlock } from "@/lib/resume/types";
import { LibraryBlockTypeFields, type LibraryBlockDetails } from "./LibraryBlockTypeFields";

const LAYOUT_KIND_OPTIONS: { value: LayoutKind; label: string }[] = [
  { value: "entry", label: "Entry (title, organization, dates, bullets)" },
  { value: "education", label: "Education" },
  { value: "skills", label: "Skills" },
];

export type LibraryBlockFormValues = LibraryBlockDetails & {
  name: string;
  defaultSectionTitle: string;
  layoutKind: LayoutKind;
  typeLabel: string;
};

export const EMPTY_LIBRARY_BLOCK_FORM: LibraryBlockFormValues = {
  name: "",
  defaultSectionTitle: "Experience",
  layoutKind: "entry",
  typeLabel: DEFAULT_TYPE_LABELS.entry,
  title: "",
  organization: "",
  location: "",
  startDate: "",
  endDate: "",
  isPresent: false,
  degree: "",
  minor: "",
  gpa: "",
  skillCategories: [{ label: "", items: [""] }],
};

/**
 * Shared fields for creating or editing a library block. The Dialog chrome,
 * initial values, and submit handling (create vs. update) stay with the
 * caller so this can be reused both as a standalone modal and inline inside
 * an already-open dialog (the editor's "add from library" menu).
 */
export function LibraryBlockForm({
  idPrefix,
  values,
  onChange,
  lockLayoutKind,
  existingBlocks = [],
  onCancel,
  onSubmit,
  loading,
  error,
  submitLabel,
  submittingLabel,
}: {
  idPrefix: string;
  values: LibraryBlockFormValues;
  onChange: (values: LibraryBlockFormValues) => void;
  lockLayoutKind?: boolean;
  /** The user's current library, used to suggest their own types first. */
  existingBlocks?: Pick<LibraryBlock, "type_label" | "layout_kind">[];
  onCancel: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  submitLabel: string;
  submittingLabel: string;
}) {
  function set<K extends keyof LibraryBlockFormValues>(field: K, value: LibraryBlockFormValues[K]) {
    onChange({ ...values, [field]: value });
  }

  function setLayoutKind(layoutKind: LayoutKind) {
    // Keep a custom type; swap a default or preset type that belongs to the old layout.
    const typeLabel =
      !normalizeTypeLabel(values.typeLabel) || findPreset(values.typeLabel, values.layoutKind)
        ? DEFAULT_TYPE_LABELS[layoutKind]
        : values.typeLabel;
    onChange({
      ...values,
      layoutKind,
      typeLabel,
      defaultSectionTitle: isAutoSectionTitle(values.defaultSectionTitle)
        ? sectionTitleFor(layoutKind, typeLabel)
        : values.defaultSectionTitle,
    });
  }

  function setTypeLabel(typeLabel: string) {
    onChange({
      ...values,
      typeLabel,
      defaultSectionTitle: isAutoSectionTitle(values.defaultSectionTitle)
        ? sectionTitleFor(values.layoutKind, typeLabel)
        : values.defaultSectionTitle,
    });
  }

  const typeOptions = buildTypeOptions({ layoutKind: values.layoutKind, query: "", blocks: existingBlocks });
  const typeChoices = [...typeOptions.yours.map((type) => type.label), ...typeOptions.presets.map((preset) => preset.label)];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pt-2"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name (library-only label)</Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="Google SWE — Summer 2025"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-layout-kind`}>Layout</Label>
        <Select value={values.layoutKind} onValueChange={(v) => setLayoutKind(v as LayoutKind)} disabled={lockLayoutKind}>
          <SelectTrigger id={`${idPrefix}-layout-kind`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LAYOUT_KIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-type-label`}>Type</Label>
        <Combobox
          id={`${idPrefix}-type-label`}
          value={values.typeLabel}
          onChange={setTypeLabel}
          options={typeChoices}
          showAllWhenExactMatch
          placeholder="Work experience, Project, Clinical rotation…"
        />
        <p className="text-xs text-muted-foreground">
          Pick one of yours or type a new name. It groups this block in your library.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-default-section`}>Default section title</Label>
        <Input
          id={`${idPrefix}-default-section`}
          placeholder="Experience"
          value={values.defaultSectionTitle}
          onChange={(e) => set("defaultSectionTitle", e.target.value)}
          required
        />
      </div>
      <LibraryBlockTypeFields
        idPrefix={idPrefix}
        layoutKind={values.layoutKind}
        typeLabel={values.typeLabel}
        details={values}
        setDetail={(field, value) => onChange({ ...values, [field]: value })}
      />
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
