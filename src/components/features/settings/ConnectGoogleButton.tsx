"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Links a Google identity to the signed-in account. Needs manual linking enabled in Supabase Auth. */
export function ConnectGoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings/account` },
    });
    if (linkError) {
      setError("Couldn't connect Google. Account linking may not be turned on yet.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={connect} disabled={pending}>
        {pending ? "Opening Google…" : "Connect with Google"}
      </Button>
      {error && <span role="alert" className="max-w-64 text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
