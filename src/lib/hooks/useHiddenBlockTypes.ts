"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/utils";

const SUPABASE_TIMEOUT_MS = 10_000;

/**
 * Library block type presets live in code, so hiding one is stored as a
 * per-user row in user_field_options (field = 'block_type', hidden = true).
 * Hiding only affects the suggestion list; blocks keep their type.
 */
export function useHiddenBlockTypes() {
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    withTimeout(
      supabase.from("user_field_options").select("value").eq("field", "block_type").eq("hidden", true),
      SUPABASE_TIMEOUT_MS,
    ).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setHidden(data.map((row) => row.value));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function hideType(label: string) {
    const previous = hidden;
    setHidden((prev) => (prev.some((v) => v.toLowerCase() === label.toLowerCase()) ? prev : [...prev, label]));
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await withTimeout(
        supabase
          .from("user_field_options")
          .upsert(
            { user_id: userId, field: "block_type", value: label, hidden: true },
            { onConflict: "user_id,field,value" },
          ),
        SUPABASE_TIMEOUT_MS,
      );
      if (error) throw error;
    } catch {
      setHidden(previous);
    }
  }

  async function restoreType(label: string) {
    const previous = hidden;
    setHidden((prev) => prev.filter((v) => v.toLowerCase() !== label.toLowerCase()));
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await withTimeout(
        supabase.from("user_field_options").delete().eq("field", "block_type").eq("value", label),
        SUPABASE_TIMEOUT_MS,
      );
      if (error) throw error;
    } catch {
      setHidden(previous);
    }
  }

  return { hidden, hideType, restoreType };
}
