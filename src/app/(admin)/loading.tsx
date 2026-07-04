// Instant skeleton while the dashboard's server data loads — makes navigation
// feel immediate instead of frozen.
export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-border bg-muted/30" />
    </div>
  );
}
