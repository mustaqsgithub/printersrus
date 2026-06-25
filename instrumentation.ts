export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDatabase } = await import("@/lib/database");
    await initDatabase();

    // Resume any enrichment left pending/stuck by a previous run (e.g. a restart
    // mid-import). Fire-and-forget; no-op if the queue is empty.
    const { triggerEnrichment } = await import("@/lib/enrichment");
    triggerEnrichment();
  }
}
