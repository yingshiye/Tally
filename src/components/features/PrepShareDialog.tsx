"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/utils";

const SUPABASE_TIMEOUT_MS = 10_000;

type Share = { token: string; display_name: string | null };

const subscribeNoop = () => () => {};

export function PrepShareDialog({
  userId,
  initialShare,
}: {
  userId: string;
  initialShare: Share | null;
}) {
  const [share, setShare] = useState<Share | null>(initialShare);
  const [name, setName] = useState(initialShare?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => "",
  );
  const url = share ? `${origin}/p/${share.token}` : "";

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    try {
      const { error: actionError } = await withTimeout(action(), SUPABASE_TIMEOUT_MS);
      if (actionError) {
        setError(actionError.message);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createLink() {
    const supabase = getSupabaseBrowserClient();
    const displayName = name.trim() === "" ? null : name.trim();
    let created: Share | null = null;
    const ok = await run(async () => {
      const { data, error: insertError } = await supabase
        .from("prep_shares")
        .insert({ user_id: userId, display_name: displayName })
        .select("token,display_name")
        .single();
      created = data;
      return { error: insertError };
    });
    if (ok && created) setShare(created);
  }

  async function saveName() {
    if (!share) return;
    const supabase = getSupabaseBrowserClient();
    const displayName = name.trim() === "" ? null : name.trim();
    const ok = await run(async () =>
      supabase.from("prep_shares").update({ display_name: displayName }).eq("user_id", userId),
    );
    if (ok) setShare({ ...share, display_name: displayName });
  }

  async function stopSharing() {
    const supabase = getSupabaseBrowserClient();
    const ok = await run(async () =>
      supabase.from("prep_shares").delete().eq("user_id", userId),
    );
    if (ok) setShare(null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it.");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Share2 />
          {share ? "Shared" : "Share"}
          {share && (
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">Share your progress</DialogTitle>
          <DialogDescription>
            Anyone with the link sees your name, solved count, and difficulty split. Notes and
            review flags stay private.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="share-name">Display name (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="share-name"
                placeholder="Ada"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {share && (
                <Button
                  variant="outline"
                  disabled={busy || name.trim() === (share.display_name ?? "")}
                  onClick={saveName}
                >
                  Save
                </Button>
              )}
            </div>
          </div>

          {share ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="share-url">Public link</Label>
                <div className="flex gap-2">
                  <Input id="share-url" readOnly value={url} onFocus={(e) => e.target.select()} />
                  <Button onClick={copyLink} className="gap-1.5">
                    {copied ? <Check /> : <Copy />}
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start text-danger-text"
                disabled={busy}
                onClick={stopSharing}
              >
                Stop sharing
              </Button>
            </>
          ) : (
            <Button disabled={busy} onClick={createLink}>
              Create public link
            </Button>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger-text">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
