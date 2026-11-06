export default function TodayLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 p-4 sm:p-6 lg:p-8" role="status" aria-label="Loading today">
      <div className="space-y-2">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-8 w-56" />
      </div>
      <div className="skeleton h-1.5 w-full" />
      <div className="skeleton h-16 w-full rounded-xl" />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-8">
        <div className="skeleton h-96 w-full md:col-start-1 md:row-start-1" />
        <div className="space-y-4 md:col-start-2 md:row-start-1">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-10 w-full" />)}
        </div>
      </div>
    </div>
  );
}
