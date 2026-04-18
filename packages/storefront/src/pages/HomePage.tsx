/**
 * Home page with editorial "Today" section and discovery infinite scroll feed.
 */
export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Today / Editorial section */}
      <section aria-label="Today's picks">
        <h2 className="mb-6 text-3xl font-bold">Today</h2>
        <div className="mb-4 overflow-hidden rounded-2xl bg-muted p-8">
          <p className="text-lg text-muted-foreground">
            Editorial hero card — powered by PayloadCMS
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="rounded-xl border border-divider bg-surface p-4"
            >
              <div className="mb-3 aspect-video rounded-lg bg-muted" />
              <p className="font-medium">Editorial Pick #{i + 1}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Discover section */}
      <section aria-label="Discover" className="mt-12">
        <h2 className="mb-6 text-2xl font-bold">Discover</h2>
        <p className="text-muted-foreground">
          Infinite scroll recommendations will appear here — powered by the
          pluggable recommendation pipeline.
        </p>
      </section>
    </div>
  );
}
