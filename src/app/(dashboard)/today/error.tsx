"use client";

import { AlertTriangle } from "lucide-react";

export default function TodayError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center p-8 py-24 text-center" role="alert">
      <span className="flex size-10 items-center justify-center rounded-full bg-danger-bg text-danger-text">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-3 text-base font-semibold text-foreground">Couldn&apos;t load your day</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Your data is safe. Check your connection and try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-110 active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
