export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando página">
      <div className="space-y-3 animate-pulse">
        <div className="h-3 w-24 rounded bg-[var(--surface-2)]" />
        <div className="h-8 w-64 max-w-full rounded bg-[var(--surface-2)]" />
        <div className="h-4 w-96 max-w-full rounded bg-[var(--surface-2)]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="card h-28 animate-pulse">
            <div className="h-4 w-2/3 rounded bg-[var(--surface-2)]" />
            <div className="mt-4 h-7 w-1/2 rounded bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
