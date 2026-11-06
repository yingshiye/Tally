"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeUrl } from "@/lib/url";
import { localDateStamp } from "@/lib/date";
import { withTimeout } from "@/lib/utils";
import { useFieldOptions } from "@/lib/hooks/useFieldOptions";
import {
  findDuplicates,
  type DuplicateCandidate,
  type DuplicateMatch,
} from "@/lib/applications/duplicates";
import type { ApplicationStatus } from "@/types/supabase";

const SUPABASE_TIMEOUT_MS = 10_000;

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "applied", label: "Applied" },
  { value: "oa", label: "OA" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

const EMPTY_FORM = {
  company: "",
  role: "",
  location: "",
  status: "applied" as ApplicationStatus,
  applied_date: "",
  job_url: "",
  notes: "",
};

type ExtractedJob = {
  company: string;
  role: string;
  location: string;
  deadline: string;
  sponsorship: "sponsors" | "no_sponsorship" | "not_mentioned";
  sponsorship_quote: string;
};

const SPONSORSHIP_LABEL: Record<ExtractedJob["sponsorship"], string> = {
  sponsors: "Sponsorship: posting indicates sponsorship is offered.",
  no_sponsorship: "Sponsorship: posting indicates no sponsorship / US work authorization required.",
  not_mentioned: "Sponsorship: not mentioned in posting.",
};

export function AddApplicationModal({
  userId,
  existing,
}: {
  userId: string;
  existing: DuplicateCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [jdText, setJdText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const router = useRouter();
  const roleOptions = useFieldOptions("role", userId);
  const locationOptions = useFieldOptions("location", userId);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleExtract() {
    if (!jdText.trim()) return;
    setExtractError(null);
    setExtracting(true);

    try {
      const res = await withTimeout(
        fetch("/api/extract-job", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jdText }),
        }),
        SUPABASE_TIMEOUT_MS
      );
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error ?? "Extraction failed");
        return;
      }

      const extracted = data.extracted as ExtractedJob;
      setForm((prev) => {
        const sponsorshipLine = SPONSORSHIP_LABEL[extracted.sponsorship];
        const sponsorshipNote = extracted.sponsorship_quote
          ? `${sponsorshipLine} ("${extracted.sponsorship_quote}")`
          : sponsorshipLine;
        const nextNotes = [prev.notes, sponsorshipNote].filter(Boolean).join("\n");

        return {
          ...prev,
          company: extracted.company || prev.company,
          role: extracted.role || prev.role,
          location: extracted.location || prev.location,
          notes: nextNotes,
        };
      });
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setDuplicates(null);
    if (nextOpen) {
      setForm((prev) =>
        prev.applied_date
          ? prev
          : { ...prev, applied_date: localDateStamp() }
      );
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const matches = findDuplicates(existing, form);
    if (matches.length > 0) {
      setDuplicates(matches);
      return;
    }
    void saveApplication();
  }

  async function saveApplication() {
    setDuplicates(null);
    setError(null);
    setLoading(true);

    let normalizedJobUrl: string | null = null;
    if (form.job_url) {
      try {
        normalizedJobUrl = normalizeUrl(form.job_url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Enter a valid job posting URL");
        setLoading(false);
        return;
      }
    }

    const supabase = getSupabaseBrowserClient();

    try {
      const { error } = await withTimeout(
        supabase.from("applications").insert({
          user_id: userId,
          company: form.company,
          role: form.role,
          status: form.status,
          location: form.location || null,
          job_url: normalizedJobUrl,
          applied_date: form.applied_date || null,
          notes: form.notes || null,
        }),
        SUPABASE_TIMEOUT_MS
      );

      if (error) {
        setError(error.message);
        return;
      }

      if (form.location) locationOptions.addOption(form.location);

      setOpen(false);
      setForm(EMPTY_FORM);
      setJdText("");
      setExtractError(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add application
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            Add application
          </DialogTitle>
        </DialogHeader>
        {duplicates ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-sm text-foreground">
              {duplicates.some((m) => m.similarRole)
                ? "This looks like one you already added."
                : `You already have ${duplicates.length === 1 ? "another role" : `${duplicates.length} other roles`} at ${duplicates[0].application.company}.`}
            </p>
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {duplicates.map(({ application, similarRole }) => (
                <li
                  key={application.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${
                    similarRole ? "bg-warning-bg text-warning-text" : ""
                  }`}
                >
                  <span className="min-w-0 break-words">
                    {application.company} — {application.role}
                    {similarRole && (
                      <span className="ml-2 text-xs font-medium">likely duplicate</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {application.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Adding &ldquo;{form.role}&rdquo; at {form.company}.
            </p>
            {error && <p className="text-sm text-danger-text">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDuplicates(null)}>
                Back to edit
              </Button>
              <Button type="button" disabled={loading} onClick={() => void saveApplication()}>
                {loading ? "Adding…" : "Add anyway"}
              </Button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5 rounded-md border border-dashed p-3">
            <Label htmlFor="jd_text">Paste job description (optional)</Label>
            <Textarea
              id="jd_text"
              placeholder="Paste the full job posting text here…"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={3}
              className="max-h-40 overflow-y-auto"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 self-start"
              disabled={!jdText.trim() || extracting}
              onClick={handleExtract}
            >
              <Sparkles className="h-4 w-4" />
              {extracting ? "Extracting…" : "Autofill from description"}
            </Button>
            {extractError && (
              <p className="text-sm text-danger-text">{extractError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Fills in company, role, and location below — review before saving.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Acme Corp"
              value={form.company}
              onChange={(e) => set("company", e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <Combobox
              id="role"
              placeholder="Software Engineer Intern"
              value={form.role}
              onChange={(v) => set("role", v)}
              options={roleOptions.options}
              removableOptions={roleOptions.options}
              onRemoveOption={roleOptions.removeOption}
              onSaveOption={roleOptions.addOption}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Combobox
              id="location"
              placeholder="New York, NY or Remote"
              value={form.location}
              onChange={(v) => set("location", v)}
              options={locationOptions.options}
              removableOptions={locationOptions.options}
              onRemoveOption={locationOptions.removeOption}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v)}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="applied_date">Applied date</Label>
            <DatePicker
              id="applied_date"
              value={form.applied_date}
              onChange={(value) => set("applied_date", value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="job_url">Job posting URL</Label>
            <Input
              id="job_url"
              type="url"
              placeholder="https://jobs.example.com/..."
              value={form.job_url}
              onChange={(e) => set("job_url", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any notes…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>
          {error && (
            <p className="text-sm text-danger-text">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding…" : "Add application"}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
