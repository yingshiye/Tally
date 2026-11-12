"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addLibraryBullet,
  deleteLibraryBlock,
  deleteLibraryBullet,
  reorderLibraryBullets,
  updateLibraryBullet,
} from "@/lib/resume/library";
import type {
  LayoutKind,
  LibraryBlock,
  LibraryBullet,
  SkillsData,
} from "@/lib/resume/types";
import type { Resume, ResumeSection } from "@/lib/resume/types";
import { createSection } from "@/lib/resume/sections";
import { copyBlockIntoSection } from "@/lib/resume/entries";
import { blockTypeLabel, countTypes } from "@/lib/resume/block-types";
import { AddResumeBlockModal } from "./AddResumeBlockModal";
import { EditResumeBlockModal } from "./EditResumeBlockModal";

const LAYOUT_KIND_LABELS: Record<LayoutKind, string> = {
  entry: "Entry",
  education: "Education",
  skills: "Skills",
};

const KIND_ICONS: Record<LayoutKind, LucideIcon> = {
  entry: Briefcase,
  education: GraduationCap,
  skills: Wrench,
};

const KIND_TONES: Record<LayoutKind, string> = {
  entry: "bg-accent text-accent-foreground",
  education: "bg-warning-bg text-warning-text",
  skills: "bg-success-bg text-success-text",
};

const MAX_DOTS = 6;

export function ResumeBlocksPanel({
  blocks,
  bullets,
  resumes,
  sections,
  userId,
}: {
  blocks: LibraryBlock[];
  bullets: LibraryBullet[];
  resumes: Resume[];
  sections: ResumeSection[];
  userId: string;
}) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const bulletsByBlock = useMemo(() => {
    const map = new Map<string, LibraryBullet[]>();
    for (const bullet of bullets) {
      const list = map.get(bullet.block_id) ?? [];
      list.push(bullet);
      map.set(bullet.block_id, list);
    }
    return map;
  }, [bullets]);

  const typeCounts = useMemo(() => countTypes(blocks), [blocks]);

  // A filter pointing at a type that no longer exists (after re-categorizing
  // its last block) falls back to "all" instead of showing an empty list.
  const activeFilter =
    typeFilter === "all" || typeCounts.some((type) => type.label.toLowerCase() === typeFilter)
      ? typeFilter
      : "all";

  const filteredBlocks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return blocks.filter((block) => {
      const typeLabel = blockTypeLabel(block);
      if (activeFilter !== "all" && typeLabel.toLowerCase() !== activeFilter) return false;
      if (!term) return true;
      return (
        block.name.toLowerCase().includes(term) ||
        typeLabel.toLowerCase().includes(term) ||
        (block.title ?? "").toLowerCase().includes(term) ||
        (block.organization ?? "").toLowerCase().includes(term)
      );
    });
  }, [blocks, activeFilter, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter blocks by type"
            className="flex flex-wrap gap-1.5"
          >
            {[{ label: "All", key: "all", count: blocks.length }, ...typeCounts.map((type) => ({ label: type.label, key: type.label.toLowerCase(), count: type.count }))].map((opt) => {
              const active = activeFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTypeFilter(opt.key)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {opt.label}
                  <span
                    className={cn(
                      "tabular-nums",
                      active ? "opacity-70" : "text-subtle-foreground",
                    )}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
          <Input
            placeholder="Search blocks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
        </div>
        <AddResumeBlockModal userId={userId} existingBlocks={blocks} />
      </div>

      {filteredBlocks.length === 0 ? (
        <Card className="items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {blocks.length === 0
              ? "No blocks yet. Add your first experience, education, or skills block."
              : "No blocks match this filter."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredBlocks.map((block) => (
            <LibraryBlockCard
              key={block.id}
              block={block}
              allBlocks={blocks}
              bullets={bulletsByBlock.get(block.id) ?? []}
              resumes={resumes}
              sections={sections}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryBlockCard({
  block,
  allBlocks,
  bullets,
  resumes,
  sections,
}: {
  block: LibraryBlock;
  allBlocks: LibraryBlock[];
  bullets: LibraryBullet[];
  resumes: Resume[];
  sections: ResumeSection[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteBlock() {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteLibraryBlock(supabase, block.id);
      setDeleteOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const subtitleParts = [block.title, block.organization].filter(Boolean);
  const KindIcon = KIND_ICONS[block.layout_kind];
  const isSkills = block.layout_kind === "skills";
  const skillCategories = (
    (block.skills_data as SkillsData | null)?.categories ?? []
  ).filter((category) => category.label || category.items.length > 0);
  const skillCount = skillCategories.reduce(
    (total, category) => total + category.items.length,
    0,
  );

  return (
    <>
      <Card className="gap-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
            <span
              title={LAYOUT_KIND_LABELS[block.layout_kind]}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                KIND_TONES[block.layout_kind],
              )}
            >
              <KindIcon className="size-4" aria-hidden="true" />
              <span className="sr-only">
                {LAYOUT_KIND_LABELS[block.layout_kind]}
              </span>
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {block.name}
                </p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {blockTypeLabel(block)}
                </span>
              </div>
              {subtitleParts.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {subtitleParts.join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              title="Add to resume"
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
            >
              <FilePlus2 className="h-3.5 w-3.5" /> Add to resume
            </button>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={
                isSkills
                  ? expanded
                    ? "Hide skills"
                    : "Show skills"
                  : expanded
                    ? "Hide bullets"
                    : "Show bullets"
              }
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {isSkills ? (
                <>
                  <span
                    className="w-[46px] text-right text-subtle-foreground"
                    aria-hidden="true"
                  >
                    {skillCount === 1 ? "skill" : "skills"}
                  </span>
                  <span className="w-4 text-right tabular-nums">
                    {skillCount}
                  </span>
                  <span className="sr-only">
                    {skillCount === 1 ? "skill" : "skills"} in{" "}
                    {skillCategories.length}{" "}
                    {skillCategories.length === 1 ? "category" : "categories"}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="flex w-[46px] items-center justify-end gap-0.5"
                    aria-hidden="true"
                  >
                    {Array.from(
                      { length: Math.min(bullets.length, MAX_DOTS) },
                      (_, dot) => (
                        <span
                          key={dot}
                          className="size-1.5 rounded-full bg-subtle-foreground"
                        />
                      ),
                    )}
                  </span>
                  <span className="w-4 text-right tabular-nums">
                    {bullets.length}
                  </span>
                  <span className="sr-only">
                    {bullets.length === 1 ? "bullet" : "bullets"}
                  </span>
                </>
              )}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            <Tooltip label="Edit block">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                aria-label={`Edit ${block.name}`}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip label="Delete block">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label={`Delete ${block.name}`}
                className="rounded p-1.5 text-muted-foreground hover:bg-danger-bg hover:text-danger-text"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>

        {expanded &&
          (isSkills ? (
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              {skillCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No skills yet. Use Edit to add categories.
                </p>
              ) : (
                skillCategories.map((category, index) => (
                  <p key={index} className="text-sm text-foreground">
                    <span className="font-medium">{category.label}</span>
                    {category.label && category.items.length > 0 ? ": " : ""}
                    <span className="text-muted-foreground">
                      {category.items.join(", ")}
                    </span>
                  </p>
                ))
              )}
            </div>
          ) : (
            <BulletsEditor blockId={block.id} bullets={bullets} />
          ))}
      </Card>

      <EditResumeBlockModal
        block={block}
        existingBlocks={allBlocks}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AddBlockToResumeDialog
        block={block}
        bullets={bullets}
        resumes={resumes}
        sections={sections}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!next) setError(null);
          setDeleteOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-medium">
              Delete block?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes{" "}
            <span className="font-medium text-foreground">{block.name}</span>{" "}
            and its bullets from your library. Resumes that already copied
            content from it keep their own copy — nothing on an existing resume
            changes.
          </p>
          {error && <p className="text-sm text-danger-text">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBlock}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddBlockToResumeDialog({
  block,
  bullets,
  resumes,
  sections,
  open,
  onOpenChange,
}: {
  block: LibraryBlock;
  bullets: LibraryBullet[];
  resumes: Resume[];
  sections: ResumeSection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  const [sectionId, setSectionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resume = resumes.find((item) => item.id === resumeId);
  const compatible = sections.filter(
    (section) =>
      section.resume_id === resumeId &&
      section.layout_kind === block.layout_kind,
  );

  async function handleAdd() {
    if (!resume) return;
    setBusy(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    let revision = resume.revision;
    let targetSectionId = sectionId;
    if (!targetSectionId) {
      const created = await createSection(supabase, resume.id, revision, {
        title:
          block.default_section_title || LAYOUT_KIND_LABELS[block.layout_kind],
        layoutKind: block.layout_kind,
      });
      if (!created.ok) {
        setError(created.message);
        setBusy(false);
        return;
      }
      targetSectionId = created.data[0].section_id;
      revision = created.data[0].revision;
    }
    const copied = await copyBlockIntoSection(
      supabase,
      resume.id,
      revision,
      targetSectionId,
      block.id,
      bullets.map((bullet) => bullet.id),
    );
    setBusy(false);
    if (!copied.ok) {
      setError(copied.message);
      return;
    }
    onOpenChange(false);
    router.push(`/resumes/${resume.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add “{block.name}” to a resume</DialogTitle>
          <DialogDescription>
            Choose a resume and a compatible section. If needed, a section is
            created automatically.
          </DialogDescription>
        </DialogHeader>
        {resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a resume first, then add this block.
          </p>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Resume</span>
              <select
                value={resumeId}
                onChange={(event) => {
                  setResumeId(event.target.value);
                  setSectionId("");
                }}
                className="h-9 rounded-md border border-border bg-transparent px-2"
              >
                {resumes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Section</span>
              <select
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                className="h-9 rounded-md border border-border bg-transparent px-2"
              >
                <option value="">
                  Create “
                  {block.default_section_title ||
                    LAYOUT_KIND_LABELS[block.layout_kind]}
                  ”
                </option>
                {compatible.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
            {error && <p className="text-sm text-danger-text">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleAdd()} disabled={busy}>
                {busy ? "Adding…" : "Add and open resume"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BulletsEditor({
  blockId,
  bullets,
}: {
  blockId: string;
  bullets: LibraryBullet[];
}) {
  const router = useRouter();
  const [newContent, setNewContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    await withBusy(async () => {
      const supabase = getSupabaseBrowserClient();
      await addLibraryBullet(
        supabase,
        (await supabase.auth.getUser()).data.user!.id,
        blockId,
        newContent,
      );
      setNewContent("");
    });
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= bullets.length) return;
    const reordered = [...bullets];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    await withBusy(async () => {
      const supabase = getSupabaseBrowserClient();
      await reorderLibraryBullets(
        supabase,
        blockId,
        reordered.map((b) => b.id),
      );
    });
  }

  async function handleDelete(bulletId: string) {
    await withBusy(async () => {
      const supabase = getSupabaseBrowserClient();
      await deleteLibraryBullet(supabase, bulletId);
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3 ">
      {bullets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No bullets yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {bullets.map((bullet, index) => (
            <BulletRow
              key={bullet.id}
              bullet={bullet}
              onMoveUp={index > 0 ? () => handleMove(index, -1) : undefined}
              onMoveDown={
                index < bullets.length - 1
                  ? () => handleMove(index, 1)
                  : undefined
              }
              onDelete={() => handleDelete(bullet.id)}
              busy={busy}
            />
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-start gap-2 pt-1">
        <Textarea
          placeholder="Add a reusable bullet…"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          rows={2}
          className="flex-1"
        />
        <Tooltip label="Add bullet">
          <span className="inline-flex">
            <Button
              type="submit"
              size="sm"
              aria-label="Add bullet"
              disabled={busy || !newContent.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </span>
        </Tooltip>
      </form>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
}

function BulletRow({
  bullet,
  onMoveUp,
  onMoveDown,
  onDelete,
  busy,
}: {
  bullet: LibraryBullet;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(bullet.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await updateLibraryBullet(supabase, bullet.id, content);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-1.5 rounded-md bg-muted p-2 ">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
        />
        {error && <p className="text-xs text-danger-text">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setContent(bullet.content);
              setEditing(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !content.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-2 rounded-md px-1 py-1 hover:bg-muted">
      <span className="text-sm text-foreground">{bullet.content}</span>
      <div className="flex shrink-0 items-center gap-0.5">
        <BulletIconButton
          label="Move bullet up"
          onClick={onMoveUp}
          disabled={!onMoveUp || busy}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </BulletIconButton>
        <BulletIconButton
          label="Move bullet down"
          onClick={onMoveDown}
          disabled={!onMoveDown || busy}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </BulletIconButton>
        <BulletIconButton label="Edit bullet" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </BulletIconButton>
        <BulletIconButton
          label="Delete bullet"
          onClick={onDelete}
          disabled={busy}
          destructive
        >
          <Trash2 className="h-3.5 w-3.5" />
        </BulletIconButton>
      </div>
    </li>
  );
}

function BulletIconButton({
  label,
  onClick,
  disabled,
  destructive = false,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={
        destructive
          ? "rounded p-1 text-muted-foreground hover:bg-danger-bg hover:text-danger-text disabled:opacity-30"
          : "rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
      }
    >
      {children}
    </button>
  );

  return (
    <Tooltip label={label}>
      {disabled ? <span className="inline-flex">{button}</span> : button}
    </Tooltip>
  );
}
