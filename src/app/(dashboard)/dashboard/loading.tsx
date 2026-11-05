export default function DashboardLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 sm:p-6 lg:p-8"
      role="status"
      aria-label="Loading applications"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-4 w-56" />
        </div>
        <div className="skeleton h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-3 bg-card p-4 sm:p-5">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-7 w-10" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="skeleton h-4 w-28" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
            <div className="skeleton size-8" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-28" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
