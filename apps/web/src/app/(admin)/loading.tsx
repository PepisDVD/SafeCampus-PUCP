export default function AdminLoading() {
  return (
    <div className="space-y-5 p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 animate-pulse rounded-md bg-slate-200" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div className="h-105 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
